# Private novel import API

This API accepts source material from `C:\Winpp\Nvl` into private staging. It does not publish a novel or grant content rights.

## Configuration

Configure the same secret in both applications. Use a random value of at least 32 characters and do not commit it.

```dotenv
# Niyainow
NOVEL_IMPORT_TOKEN=<shared-secret>
```

```powershell
# C:\Winpp\Nvl
$env:PENHOME_API_URL = "http://localhost:3000"
$env:PENHOME_IMPORT_TOKEN = "<shared-secret>"
```

Remote origins and source URLs must use HTTPS. Loopback HTTP is accepted for local development. Every request uses `Authorization: Bearer <shared-secret>` and `Content-Type: application/json`.

## Register a source

`POST /api/internal/novel-import/sources`

```json
{
  "provider": "mvlempyr",
  "externalWorkId": "5117",
  "seedUrl": "https://www.example.com/chapter/5117-1",
  "coverUrl": "https://assets.mvlempyr.app/images/900/5117.webp",
  "originalTitle": "Original title",
  "sourceLanguage": "en",
  "originalSynopsis": "Optional source synopsis",
  "localizations": [
    {
      "language": "th",
      "title": "ชื่อภาษาไทย",
      "synopsis": "เรื่องย่อภาษาไทย",
      "status": "draft"
    }
  ],
  "metadata": {}
}
```

The idempotency key is `(provider, externalWorkId)`. Language values are canonical BCP 47 tags such as `en`, `th`, `ja-JP`, or `zh-Hant`.

`coverUrl` is optional. For an allowlisted provider, the server fetches the image over HTTPS, verifies its file signature and 8 MB size limit, then stores it in R2 instead of hotlinking the provider. Source registration still succeeds when a cover fails; the response and `/admin/imports` expose `coverStatus` and a safe `coverError` so the import can be retried without dropping chapters.

## Import chapters

`POST /api/internal/novel-import/chapters/batch`

```json
{
  "provider": "mvlempyr",
  "externalWorkId": "5117",
  "chapters": [
    {
      "chapterNumber": 1,
      "sourceUrl": "https://www.example.com/chapter/5117-1",
      "originalTitle": "Chapter 1",
      "originalText": "Source-language text",
      "sourceLanguage": "en",
      "fetchedAt": "2026-09-08T12:00:00+07:00",
      "translations": [
        {
          "language": "th",
          "title": "ตอนที่ 1",
          "content": "ฉบับแปลภาษาไทย",
          "status": "draft"
        }
      ]
    }
  ]
}
```

A batch contains 1–20 unique chapter numbers. Chapter identity is `(sourceId, chapterNumber)` while text identity is `(chapterId, language)`, so one chapter can hold any number of separately versioned languages. An accepted chapter action is `created`, `updated`, or `unchanged`; an older conflicting fetch returns `stale`. Out-of-order chapters may be staged, but `nextProbeChapter` advances only across a complete contiguous sequence and never jumps over a missing chapter.

Translation status is one of `draft`, `reviewed`, or `approved`. Source text is always stored with `source` status. The API keeps source identity, localized metadata, chapter identity, and localized chapter bodies in separate tables so adding a new language never duplicates or overwrites the original text.

## Apply the schema

```powershell
npm run db:migrate
```

The migration creates:

- `novel_import_sources`
- `novel_import_source_texts`
- `novel_import_chapters`
- `novel_import_chapter_texts`

The cover workflow also records the R2 object in `media_assets` and stores its object key and upload status on `novel_import_sources`.

`linked_novel_id` and `linked_chapter_id` are nullable links to the public catalog. Importing alone never creates public content; the first approved Translation Studio publication creates and links those records automatically.
