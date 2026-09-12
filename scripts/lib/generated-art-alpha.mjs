import sharp from "sharp";

function isBakedTransparencyPixel(data, offset) {
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const highest = Math.max(red, green, blue);
  const lowest = Math.min(red, green, blue);
  const luminance = (red + green + blue) / 3;

  // Image generation previews can contain a literal neutral checkerboard.
  // Allow small compression/color-management drift while keeping warm artwork.
  return highest - lowest <= 18 && luminance >= 100;
}

function hasUsefulAlpha(data, pixelCount) {
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (data[pixel * 4 + 3] < 250) return true;
  }
  return false;
}

function eraseTransparentRgb(data, pixelCount) {
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    if (data[offset + 3] !== 0) continue;
    data[offset] = 0;
    data[offset + 1] = 0;
    data[offset + 2] = 0;
  }
}

function markBakedBackground(data, width, height) {
  const pixelCount = width * height;
  const background = new Uint8Array(pixelCount);
  const queue = new Uint32Array(pixelCount);
  let head = 0;
  let tail = 0;

  const enqueue = (pixel) => {
    if (background[pixel] || !isBakedTransparencyPixel(data, pixel * 4)) return;
    background[pixel] = 1;
    queue[tail] = pixel;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const pixel = queue[head];
    head += 1;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) enqueue(pixel - 1);
    if (x + 1 < width) enqueue(pixel + 1);
    if (y > 0) enqueue(pixel - width);
    if (y + 1 < height) enqueue(pixel + width);
  }

  return { background, count: tail };
}

function checkerLuminanceCenters(data, background) {
  let low = 255;
  let high = 0;
  for (let pixel = 0; pixel < background.length; pixel += 1) {
    if (!background[pixel]) continue;
    const offset = pixel * 4;
    const luminance = (data[offset] + data[offset + 1] + data[offset + 2]) / 3;
    low = Math.min(low, luminance);
    high = Math.max(high, luminance);
  }

  for (let iteration = 0; iteration < 8; iteration += 1) {
    let lowSum = 0;
    let lowCount = 0;
    let highSum = 0;
    let highCount = 0;
    for (let pixel = 0; pixel < background.length; pixel += 1) {
      if (!background[pixel]) continue;
      const offset = pixel * 4;
      const luminance = (data[offset] + data[offset + 1] + data[offset + 2]) / 3;
      if (Math.abs(luminance - low) <= Math.abs(luminance - high)) {
        lowSum += luminance;
        lowCount += 1;
      } else {
        highSum += luminance;
        highCount += 1;
      }
    }
    if (lowCount) low = lowSum / lowCount;
    if (highCount) high = highSum / highCount;
  }
  return low <= high ? [low, high] : [high, low];
}

function markCheckerToneNeighborhoods(data, background, width, height, lowCenter, highCenter) {
  const stride = width + 1;
  const lowIntegral = new Uint32Array(stride * (height + 1));
  const highIntegral = new Uint32Array(stride * (height + 1));
  const toneTolerance = 18;

  for (let y = 1; y <= height; y += 1) {
    let lowRow = 0;
    let highRow = 0;
    for (let x = 1; x <= width; x += 1) {
      const pixel = (y - 1) * width + x - 1;
      const offset = pixel * 4;
      if (isBakedTransparencyPixel(data, offset)) {
        const luminance = (data[offset] + data[offset + 1] + data[offset + 2]) / 3;
        if (Math.abs(luminance - lowCenter) <= toneTolerance) lowRow += 1;
        if (Math.abs(luminance - highCenter) <= toneTolerance) highRow += 1;
      }
      const integralOffset = y * stride + x;
      lowIntegral[integralOffset] = lowIntegral[integralOffset - stride] + lowRow;
      highIntegral[integralOffset] = highIntegral[integralOffset - stride] + highRow;
    }
  }

  const regionCount = (integral, left, top, right, bottom) => {
    const x1 = Math.max(0, left);
    const y1 = Math.max(0, top);
    const x2 = Math.min(width, right + 1);
    const y2 = Math.min(height, bottom + 1);
    return integral[y2 * stride + x2] - integral[y1 * stride + x2] -
      integral[y2 * stride + x1] + integral[y1 * stride + x1];
  };

  const radius = Math.max(8, Math.round(Math.min(width, height) / 100));
  const newlyMarked = new Uint8Array(width * height);
  let added = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      if (background[pixel] || !isBakedTransparencyPixel(data, pixel * 4)) continue;
      const offset = pixel * 4;
      const luminance = (data[offset] + data[offset + 1] + data[offset + 2]) / 3;
      const isLowTone = Math.abs(luminance - lowCenter) <= toneTolerance;
      const isHighTone = Math.abs(luminance - highCenter) <= toneTolerance;
      if (!isLowTone && !isHighTone) continue;
      const oppositeCount = isLowTone
        ? regionCount(highIntegral, x - radius, y - radius, x + radius, y + radius)
        : regionCount(lowIntegral, x - radius, y - radius, x + radius, y + radius);
      if (oppositeCount < 6) continue;
      newlyMarked[pixel] = 1;
      added += 1;
    }
  }
  for (let pixel = 0; pixel < newlyMarked.length; pixel += 1) {
    if (newlyMarked[pixel]) background[pixel] = 1;
  }
  return added;
}

function markEnclosedCheckerComponents(data, background, width, height, aggressive = false) {
  const pixelCount = width * height;
  const visited = background.slice();
  const [lowCenter, highCenter] = checkerLuminanceCenters(data, background);
  if (highCenter - lowCenter < 24) return 0;

  let added = 0;
  for (let start = 0; start < pixelCount; start += 1) {
    if (visited[start] || !isBakedTransparencyPixel(data, start * 4)) continue;
    const component = [start];
    visited[start] = 1;
    let head = 0;
    let sum = 0;
    let sumSquared = 0;
    let nearLow = 0;
    let nearHigh = 0;

    while (head < component.length) {
      const pixel = component[head];
      head += 1;
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      const offset = pixel * 4;
      const luminance = (data[offset] + data[offset + 1] + data[offset + 2]) / 3;
      sum += luminance;
      sumSquared += luminance * luminance;
      if (Math.abs(luminance - lowCenter) <= 18) nearLow += 1;
      if (Math.abs(luminance - highCenter) <= 18) nearHigh += 1;

      const neighbors = [pixel - 1, pixel + 1, pixel - width, pixel + width];
      for (const neighbor of neighbors) {
        if (neighbor < 0 || neighbor >= pixelCount || visited[neighbor]) continue;
        const neighborX = neighbor % width;
        const neighborY = Math.floor(neighbor / width);
        if (Math.abs(neighborX - x) + Math.abs(neighborY - y) !== 1) continue;
        if (!isBakedTransparencyPixel(data, neighbor * 4)) continue;
        visited[neighbor] = 1;
        component.push(neighbor);
      }
    }

    const size = component.length;
    const mean = sum / size;
    const deviation = Math.sqrt(Math.max(0, sumSquared / size - mean * mean));
    const lowShare = nearLow / size;
    const highShare = nearHigh / size;
    // Enclosed checker gaps contain substantial amounts of both checker tones.
    // Pale petals and stone highlights usually cluster around only one tone.
    // Dense foliage splits enclosed checker gaps into lower-contrast islands.
    // The aggressive tree profile still requires both learned checker tones,
    // which protects warm bark, gold leaves, and pale blossoms.
    const minimumSize = aggressive ? 12 : 20;
    const minimumDeviation = aggressive ? 12 : 24;
    const minimumToneShare = aggressive ? 0.06 : 0.12;
    const minimumCombinedShare = aggressive ? 0.52 : 0.7;
    const matchesChecker = size >= minimumSize && deviation >= minimumDeviation &&
      lowShare >= minimumToneShare && highShare >= minimumToneShare &&
      lowShare + highShare >= minimumCombinedShare;
    if (!matchesChecker) continue;
    for (const pixel of component) background[pixel] = 1;
    added += size;
  }
  if (aggressive) {
    added += markCheckerToneNeighborhoods(data, background, width, height, lowCenter, highCenter);
  }
  return added;
}

function buildFringeBands(background, width, height, bandCount) {
  const pixelCount = width * height;
  const bands = new Uint8Array(pixelCount);
  const claimed = background.slice();
  let previous = background;

  for (let band = 1; band <= bandCount; band += 1) {
    const next = new Uint8Array(pixelCount);
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const pixel = y * width + x;
        if (claimed[pixel]) continue;
        const touchesPrevious = previous[pixel - 1] || previous[pixel + 1] ||
          previous[pixel - width] || previous[pixel + width];
        if (!touchesPrevious) continue;
        next[pixel] = 1;
        bands[pixel] = band;
        claimed[pixel] = 1;
      }
    }
    previous = next;
  }

  return bands;
}

function copyNearestInteriorColor(data, bands, background, width, height, pixel, band) {
  const x = pixel % width;
  const y = Math.floor(pixel / width);
  for (let radius = 1; radius <= 4; radius += 1) {
    let red = 0;
    let green = 0;
    let blue = 0;
    let samples = 0;
    for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
      for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
        if (Math.max(Math.abs(offsetX), Math.abs(offsetY)) !== radius) continue;
        const sampleX = x + offsetX;
        const sampleY = y + offsetY;
        if (sampleX < 0 || sampleY < 0 || sampleX >= width || sampleY >= height) continue;
        const sample = sampleY * width + sampleX;
        if (background[sample] || (bands[sample] !== 0 && bands[sample] <= band)) continue;
        const sampleOffset = sample * 4;
        red += data[sampleOffset];
        green += data[sampleOffset + 1];
        blue += data[sampleOffset + 2];
        samples += 1;
      }
    }
    if (samples === 0) continue;
    const offset = pixel * 4;
    data[offset] = Math.round(red / samples);
    data[offset + 1] = Math.round(green / samples);
    data[offset + 2] = Math.round(blue / samples);
    return;
  }
}

function decontaminateFringe(data, background, bands, width, height, featherAlphas) {
  const pixelCount = width * height;
  for (let band = featherAlphas.length; band >= 1; band -= 1) {
    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      if (bands[pixel] !== band) continue;
      copyNearestInteriorColor(data, bands, background, width, height, pixel, band);
      data[pixel * 4 + 3] = Math.min(data[pixel * 4 + 3], featherAlphas[band - 1]);
    }
  }

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (!background[pixel]) continue;
    const offset = pixel * 4;
    data[offset] = 0;
    data[offset + 1] = 0;
    data[offset + 2] = 0;
    data[offset + 3] = 0;
  }
}

function removeTinyComponents(data, width, height, minimumPixels) {
  if (!minimumPixels) return { components: 0, pixels: 0 };
  const pixelCount = width * height;
  const visited = new Uint8Array(pixelCount);
  let removedComponents = 0;
  let removedPixels = 0;

  for (let start = 0; start < pixelCount; start += 1) {
    if (visited[start] || data[start * 4 + 3] === 0) continue;
    const component = [start];
    visited[start] = 1;
    let head = 0;
    while (head < component.length) {
      const pixel = component[head];
      head += 1;
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) continue;
          const neighborX = x + offsetX;
          const neighborY = y + offsetY;
          if (neighborX < 0 || neighborY < 0 || neighborX >= width || neighborY >= height) continue;
          const neighbor = neighborY * width + neighborX;
          if (visited[neighbor] || data[neighbor * 4 + 3] === 0) continue;
          visited[neighbor] = 1;
          component.push(neighbor);
        }
      }
    }
    if (component.length >= minimumPixels) continue;
    for (const pixel of component) {
      const offset = pixel * 4;
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 0;
    }
    removedComponents += 1;
    removedPixels += component.length;
  }
  return { components: removedComponents, pixels: removedPixels };
}

export async function extractGeneratedAlpha(inputPath, options = {}) {
  const source = sharp(inputPath).ensureAlpha();
  const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });
  const pixelCount = info.width * info.height;

  if (hasUsefulAlpha(data, pixelCount)) {
    eraseTransparentRgb(data, pixelCount);
    const removed = removeTinyComponents(data, info.width, info.height, options.minComponentPixels ?? 0);
    return { data, info, extracted: false, backgroundPixels: 0, featherPixels: 0, removed };
  }

  const { background, count } = markBakedBackground(data, info.width, info.height);
  if (count === 0) {
    throw new Error(`Could not identify a baked transparency background in ${inputPath}.`);
  }
  const enclosedBackgroundPixels = markEnclosedCheckerComponents(
    data,
    background,
    info.width,
    info.height,
    options.aggressiveEnclosedCheckerCleanup ?? false,
  );
  const backgroundPixels = count + enclosedBackgroundPixels;
  const downsampleRatio = options.outputWidth && options.outputHeight
    ? Math.max(info.width / options.outputWidth, info.height / options.outputHeight)
    : 1;
  const bandCount = Math.max(2, Math.min(12, Math.ceil(downsampleRatio * 1.5)));
  const featherAlphas = options.featherAlphas ?? Array.from({ length: bandCount }, (_, index) => {
    const progress = (index + 1) / (bandCount + 1);
    return Math.round(255 * progress ** 1.2);
  });
  const bands = buildFringeBands(background, info.width, info.height, featherAlphas.length);
  decontaminateFringe(data, background, bands, info.width, info.height, featherAlphas);
  const defaultMinimumPixels = Math.max(6, Math.round(pixelCount * 0.00001));
  const removed = removeTinyComponents(
    data,
    info.width,
    info.height,
    options.minComponentPixels ?? defaultMinimumPixels,
  );

  let featherPixels = 0;
  for (const band of bands) if (band !== 0) featherPixels += 1;
  return { data, info, extracted: true, backgroundPixels, enclosedBackgroundPixels, featherPixels, removed };
}

export function transparentWebpOptions() {
  // libwebp near-lossless can introduce rectangular RGB/alpha corruption on
  // highly sparse sprites. Full lossless is deterministic and keeps fine ink clean.
  return { lossless: true, exact: true, effort: 6 };
}

export async function resizeTransparentForExport(inputPath, width, height) {
  const { data, info } = await sharp(inputPath)
    .resize(width, height, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixelCount = info.width * info.height;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    const alpha = data[offset + 3];
    if (alpha <= 8) {
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 0;
    } else if (alpha >= 250) {
      data[offset + 3] = 255;
    }
  }

  return { data, info };
}
