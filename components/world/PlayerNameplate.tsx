import styles from "@/components/world/world.module.css";

export function PlayerNameplate({ name, title }: { name: string; title?: string }) {
  return (
    <div className={styles.playerNameplate}>
      <span>{name}</span>
      {title ? <small>‹{title}›</small> : null}
    </div>
  );
}
