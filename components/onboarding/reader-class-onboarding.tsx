"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";

import { BrandWordmark } from "@/components/brand/brand-mark";
import { ReaderClassIcon } from "@/components/onboarding/reader-class-icon";
import { Button } from "@/components/ui/button";
import {
  QUIZ_QUESTIONS,
  READER_CLASSES,
  READER_CLASS_STORAGE_KEY,
  getReaderClass,
  hiddenTraitFor,
  rankSelectedClasses,
  type QuizQuestionId,
  type ReaderClassId,
  type ReaderClassProfile,
} from "@/lib/onboarding/reader-class";
import { cn } from "@/lib/utils";
import styles from "./reader-class-onboarding.module.css";

type Screen = "welcome" | "genres" | "quiz" | "reveal" | "profile";

const SCREEN_STEP: Record<Screen, number> = {
  welcome: 0,
  genres: 1,
  quiz: 2,
  reveal: 3,
  profile: 4,
};

function classStyle(accent: string) {
  return { "--class-accent": accent } as CSSProperties;
}

export function ReaderClassOnboarding() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("welcome");
  const [selectedClassIds, setSelectedClassIds] = useState<ReaderClassId[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<QuizQuestionId, string>>>({});
  const [rankedClassIds, setRankedClassIds] = useState<ReaderClassId[]>([]);
  const [mainClassId, setMainClassId] = useState<ReaderClassId>("martial");
  const [subClassId, setSubClassId] = useState<ReaderClassId>("system");

  const mainClass = getReaderClass(mainClassId) ?? READER_CLASSES[0];
  const subClass = getReaderClass(subClassId) ?? READER_CLASSES[1];
  const question = QUIZ_QUESTIONS[questionIndex];
  const hiddenTrait = useMemo(() => hiddenTraitFor(answers), [answers]);

  const toggleClass = (id: ReaderClassId) => {
    setSelectedClassIds((current) => {
      if (current.includes(id)) return current.filter((classId) => classId !== id);
      if (current.length === 3) return current;
      return [...current, id];
    });
  };

  const chooseAnswer = (answerId: string) => {
    setAnswers((current) => ({ ...current, [question.id]: answerId }));
  };

  const continueQuiz = () => {
    if (questionIndex < QUIZ_QUESTIONS.length - 1) {
      setQuestionIndex((current) => current + 1);
      return;
    }

    const ranked = rankSelectedClasses(selectedClassIds, answers);
    const nextMain = ranked[0] ?? selectedClassIds[0] ?? "martial";
    const nextSub = ranked[1] ?? selectedClassIds.find((id) => id !== nextMain) ?? "system";
    setRankedClassIds(ranked);
    setMainClassId(nextMain);
    setSubClassId(nextSub);
    setScreen("reveal");
  };

  const chooseMainClass = (id: ReaderClassId) => {
    setMainClassId(id);
    if (id === subClassId) {
      setSubClassId(rankedClassIds.find((candidate) => candidate !== id) ?? selectedClassIds.find((candidate) => candidate !== id) ?? "system");
    }
  };

  const goBack = () => {
    if (screen === "genres") setScreen("welcome");
    if (screen === "quiz") {
      if (questionIndex > 0) setQuestionIndex((current) => current - 1);
      else setScreen("genres");
    }
    if (screen === "reveal") {
      setQuestionIndex(QUIZ_QUESTIONS.length - 1);
      setScreen("quiz");
    }
    if (screen === "profile") setScreen("reveal");
  };

  const finish = () => {
    const profile: ReaderClassProfile = {
      version: 1,
      classId: mainClass.id,
      subClassId: subClass.id,
      selectedClassIds,
      answers,
      hiddenTrait: hiddenTrait.label,
      hiddenTraitEmoji: hiddenTrait.emoji,
      completedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(READER_CLASS_STORAGE_KEY, JSON.stringify(profile));
    router.push("/personalize");
  };

  const restart = () => {
    setSelectedClassIds([]);
    setAnswers({});
    setRankedClassIds([]);
    setQuestionIndex(0);
    setScreen("genres");
  };

  return (
    <main id="main" className={styles.root} data-screen={screen}>
      <div className={styles.ambient} aria-hidden />

      <header className={styles.header}>
        <BrandWordmark className={styles.wordmark} />
        {screen !== "welcome" ? (
          <div className={styles.progressWrap} aria-label={`ขั้นตอน ${SCREEN_STEP[screen]} จาก 4`}>
            <span className={styles.progressLabel}>ค้นหา Reader Class</span>
            <div className={styles.progressTrack} aria-hidden>
              <i style={{ width: `${(SCREEN_STEP[screen] / 4) * 100}%` }} />
            </div>
            <span className={styles.progressNumber}>{SCREEN_STEP[screen]}/4</span>
          </div>
        ) : (
          <span className={styles.headerTag}>FIND YOUR READER CLASS</span>
        )}
      </header>

      {screen !== "welcome" ? (
        <button type="button" onClick={goBack} className={styles.backButton} aria-label="ย้อนกลับ">
          <ArrowLeft aria-hidden />
          <span>ย้อนกลับ</span>
        </button>
      ) : null}

      {screen === "welcome" ? (
        <section className={styles.welcome}>
          <div className={styles.welcomeCopy}>
            <span className={styles.kicker}><Sparkles aria-hidden /> NOVELNOW ORIGIN</span>
            <h1>ยินดีต้อนรับสู่ NovelNow</h1>
            <p className={styles.welcomeQuestion}>คุณจะเป็นนักอ่านสายไหน?</p>
            <p className={styles.welcomeDetail}>
              เลือกโลกที่ชอบ ตอบคำถามจากสัญชาตญาณ แล้วปลุก Class นักอ่านที่ซ่อนอยู่ในตัวคุณ
            </p>
            <Button size="lg" className={styles.primaryButton} onClick={() => setScreen("genres")}>
              ค้นหา Class ของฉัน <ArrowRight aria-hidden />
            </Button>
            <span className={styles.timeNote}>ใช้เวลาไม่ถึง 1 นาที · เลือก Class หลักและรองได้</span>
          </div>

          <div className={styles.welcomeArt} aria-hidden>
            <span className={styles.welcomeHalo} />
            <span className={styles.cardGhost}>READ<br />YOUR<br />DESTINY</span>
            <Image
              src="/Images/classs/01.png"
              alt=""
              width={1086}
              height={1448}
              priority
              sizes="(max-width: 820px) 88vw, (max-height: 700px) 38vw, 46vw"
              className={styles.welcomeCharacter}
            />
            <span className={styles.floatingRune}>天</span>
            <span className={styles.floatingRune}>命</span>
          </div>
        </section>
      ) : null}

      {screen === "genres" ? (
        <section className={styles.contentStage}>
          <div className={styles.sectionHeading}>
            <span className={styles.kicker}>STEP 01 · YOUR WORLDS</span>
            <h1>เลือก 3 แนวที่เรียกหาคุณ</h1>
            <p>ไม่ต้องคิดนาน เลือกเรื่องที่เห็นแล้วอยากกดอ่านทันที</p>
          </div>

          <div className={styles.genreGrid}>
            {READER_CLASSES.map((readerClass) => {
              const selectedIndex = selectedClassIds.indexOf(readerClass.id);
              const selected = selectedIndex >= 0;
              return (
                <button
                  key={readerClass.id}
                  type="button"
                  className={cn(styles.genreCard, selected && styles.genreCardSelected)}
                  style={classStyle(readerClass.accent)}
                  aria-pressed={selected}
                  onClick={() => toggleClass(readerClass.id)}
                >
                  <span className={styles.genreCardPlane} aria-hidden />
                  <Image
                    src={readerClass.image}
                    alt=""
                    width={1086}
                    height={1448}
                    sizes="(max-width: 640px) 48vw, (max-width: 1100px) 31vw, 23vw"
                    className={styles.genreCharacter}
                  />
                  <span className={styles.genreShade} aria-hidden />
                  <span className={styles.genreMeta}>
                    <ReaderClassIcon src={readerClass.icon} className={styles.genreIcon} sizes="28px" />
                    <strong>{readerClass.name}</strong>
                    <small>{readerClass.tastes.slice(0, 2).join(" · ")}</small>
                  </span>
                  {selected ? (
                    <span className={styles.selectedBadge}><Check aria-hidden /> {selectedIndex + 1}</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className={styles.stickyAction}>
            <p aria-live="polite"><strong>{selectedClassIds.length}</strong> / 3 แนวที่เลือก</p>
            <Button
              size="lg"
              className={styles.primaryButton}
              disabled={selectedClassIds.length !== 3}
              onClick={() => { setQuestionIndex(0); setScreen("quiz"); }}
            >
              ไปต่อ <ArrowRight aria-hidden />
            </Button>
          </div>
        </section>
      ) : null}

      {screen === "quiz" ? (
        <section className={styles.quizStage}>
          <div className={styles.quizAside}>
            <span className={styles.quizNumber}>0{questionIndex + 1}</span>
            <span className={styles.quizTotal}>/ 0{QUIZ_QUESTIONS.length}</span>
            <div className={styles.quizSelectedArt} aria-hidden>
              {selectedClassIds.map((id) => {
                const selectedClass = getReaderClass(id);
                if (!selectedClass) return null;
                return (
                  <Image
                    key={id}
                    src={selectedClass.image}
                    alt=""
                    width={1086}
                    height={1448}
                    sizes="(max-width: 1100px) 26vw, 280px"
                  />
                );
              })}
            </div>
          </div>

          <div className={styles.quizPanel}>
            <span className={styles.kicker}>{question.eyebrow}</span>
            <h1>{question.question}</h1>
            <div className={styles.answerGrid} role="radiogroup" aria-label={question.question}>
              {question.options.map((option, index) => {
                const chosen = answers[question.id] === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={chosen}
                    className={cn(styles.answerCard, chosen && styles.answerCardSelected)}
                    onClick={() => chooseAnswer(option.id)}
                  >
                    <span className={styles.answerLetter}>{String.fromCharCode(65 + index)}</span>
                    <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                    <span className={styles.radioMark}>{chosen ? <Check aria-hidden /> : null}</span>
                  </button>
                );
              })}
            </div>
            <Button
              size="lg"
              className={styles.quizContinue}
              disabled={!answers[question.id]}
              onClick={continueQuiz}
            >
              {questionIndex === QUIZ_QUESTIONS.length - 1 ? "เปิดผนึก Class" : "คำถามถัดไป"}
              <ArrowRight aria-hidden />
            </Button>
          </div>
        </section>
      ) : null}

      {screen === "reveal" ? (
        <section className={styles.revealStage} style={classStyle(mainClass.accent)}>
          <div className={styles.revealBurst} aria-hidden>
            {Array.from({ length: 12 }, (_, index) => (
              <i
                key={index}
                style={{ "--ray-angle": `${index * 30}deg`, "--ray-delay": `${index * 20}ms` } as CSSProperties}
              />
            ))}
          </div>
          <div className={styles.revealArt} aria-hidden>
            <span className={styles.revealHalo} />
            <Image
              src={mainClass.image}
              alt=""
              width={1086}
              height={1448}
              sizes="(max-width: 820px) 92vw, (max-height: 700px) 42vw, 47vw"
              className={styles.revealCharacter}
            />
          </div>
          <div className={styles.revealCopy}>
            <span className={styles.revealKicker}><Sparkles aria-hidden /> CLASS AWAKENED</span>
            <p>Class ของคุณคือ</p>
            <h1><ReaderClassIcon src={mainClass.icon} className={styles.revealClassIcon} sizes="72px" /> {mainClass.name}</h1>
            <h2>{mainClass.title}</h2>
            <div className={styles.revealRule} />
            <p className={styles.revealDescription}>{mainClass.description}</p>
            <div className={styles.tasteList}>
              {mainClass.tastes.map((taste) => <span key={taste}>#{taste}</span>)}
            </div>
            <Button size="lg" className={styles.primaryButton} onClick={() => setScreen("profile")}>
              จัดทีม Class ของฉัน <ArrowRight aria-hidden />
            </Button>
          </div>
        </section>
      ) : null}

      {screen === "profile" ? (
        <section className={styles.profileStage}>
          <div className={styles.sectionHeading}>
            <span className={styles.kicker}>FINAL STEP · YOUR PROFILE</span>
            <h1>คุณไม่จำเป็นต้องอยู่ Class เดียว</h1>
            <p>ผลลัพธ์คือคำแนะนำ เลือก Main และ Sub ที่เป็นคุณที่สุดได้เลย</p>
          </div>

          <div className={styles.profileLayout}>
            <div className={styles.classPicker}>
              <div className={styles.pickerHeading}>
                <span>เลือก Main Class</span>
                <small>ตัวตนหลักในหน้าโปรไฟล์</small>
              </div>
              <div className={styles.pickerGrid}>
                {rankedClassIds.map((id) => {
                  const candidate = getReaderClass(id);
                  if (!candidate) return null;
                  const active = mainClassId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={cn(styles.pickerCard, active && styles.pickerCardActive)}
                      style={classStyle(candidate.accent)}
                      onClick={() => chooseMainClass(id)}
                      aria-pressed={active}
                    >
                      <Image src={candidate.image} alt="" width={1086} height={1448} sizes="96px" />
                      <span><strong><ReaderClassIcon src={candidate.icon} className={styles.pickerClassIcon} sizes="28px" /> {candidate.name}</strong><small>{candidate.title}</small></span>
                      <i>{active ? <Check aria-hidden /> : null}</i>
                    </button>
                  );
                })}
              </div>

              <div className={styles.subPicker}>
                <span>เลือก Sub Class</span>
                <div>
                  {rankedClassIds.filter((id) => id !== mainClassId).map((id) => {
                    const candidate = getReaderClass(id);
                    if (!candidate) return null;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={subClassId === id}
                        className={cn(subClassId === id && styles.subActive)}
                        onClick={() => setSubClassId(id)}
                      >
                        <ReaderClassIcon src={candidate.icon} className={styles.subClassIcon} sizes="24px" /> {candidate.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <article className={styles.profilePreview} style={classStyle(mainClass.accent)}>
              <span className={styles.previewLabel}>READER IDENTITY</span>
              <div className={styles.previewArt} aria-hidden>
                <Image src={mainClass.image} alt="" width={1086} height={1448} sizes="360px" />
              </div>
              <div className={styles.previewContent}>
                <p>Main Class</p>
                <h2><ReaderClassIcon src={mainClass.icon} className={styles.previewClassIcon} sizes="42px" /> {mainClass.name}</h2>
                <span>{mainClass.title}</span>
                <dl>
                  <div><dt>Sub Class</dt><dd><ReaderClassIcon src={subClass.icon} className={styles.detailClassIcon} sizes="24px" /> {subClass.name}</dd></div>
                  <div><dt>Hidden Trait</dt><dd>{hiddenTrait.emoji} {hiddenTrait.label}</dd></div>
                </dl>
              </div>
            </article>
          </div>

          <div className={styles.profileActions}>
            <button type="button" onClick={restart}><RotateCcw aria-hidden /> เลือกใหม่ทั้งหมด</button>
            <Button size="lg" className={styles.primaryButton} onClick={finish}>
              เปิดโลกของฉัน <ArrowRight aria-hidden />
            </Button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
