import { useMemo, useState } from "react";
import {
  MeshButton,
  MeshNameInput,
  MeshPresence,
  MeshStatusPill,
  MeshSurface,
  useNamedPeer,
  usePerPeerValue,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";
type Props = { room: YRoom | null; config: MeshConfig };
export type RecipeStep = { text: string; submittedAt: number };
export function isValidStep(value: unknown): value is RecipeStep {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).text === "string" &&
    ((value as Record<string, unknown>).text as string).trim().length > 2 &&
    ((value as Record<string, unknown>).text as string).length <= 220 &&
    typeof (value as Record<string, unknown>).submittedAt === "number" &&
    Number.isFinite((value as Record<string, unknown>).submittedAt)
  );
}
export function Feature({ room, config }: Props) {
  const named = useNamedPeer(config, room);
  const steps = usePerPeerValue<RecipeStep | null>(room, "mesh-recipe-relay:steps", null);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const entries = useMemo(
    () =>
      steps.entries
        .filter((entry): entry is [string, RecipeStep] => isValidStep(entry[1]))
        .sort((a, b) => a[1].submittedAt - b[1].submittedAt || a[0].localeCompare(b[0])),
    [steps.entries],
  );
  const peerIds = useMemo(
    () =>
      Array.from(new Set([...Object.keys(named.names), room?.peerId ?? ""]))
        .filter(Boolean)
        .sort(),
    [named.names, room?.peerId],
  );
  const nextId = peerIds.length ? peerIds[entries.length % peerIds.length] : room?.peerId;
  const mine = isValidStep(steps.my) ? steps.my : null;
  const myTurn = Boolean(room && nextId === room.peerId && !mine);
  const recipeText = entries.map(([, step], i) => `${i + 1}. ${step.text}`).join("\n");
  const turnState = mine ? "complete" : myTurn ? "my-turn" : "waiting";
  const cookCount = room ? room.peerCount + 1 : 0;
  const connectionLabel = room
    ? `${cookCount} ${cookCount === 1 ? "cook" : "cooks"} in this kitchen`
    : "Joining the kitchen";
  const turnLabel = mine
    ? "Your instruction is in"
    : myTurn
      ? "Your turn to add the next move"
      : "Another cook has the board";
  const turnDetail = mine
    ? "Your contribution is locked, so everyone keeps the same recipe."
    : myTurn
      ? "Add one useful instruction, then pass the recipe on."
      : "The relay advances in the same order for every connected cook.";
  const share = async () => {
    try {
      await navigator.clipboard.writeText(`Mesh Recipe Relay\n\n${recipeText}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const submitStep = () => {
    if (!myTurn || draft.trim().length < 3) return;
    steps.setMy({ text: draft.trim(), submittedAt: Date.now() });
    setDraft("");
  };

  return (
    <main className="relay-page">
      <div className="relay-scene">
        <header className="relay-intro">
          <div className="relay-title-block">
            <p className="relay-kicker">A shared kitchen card</p>
            <h1>Make the recipe together, one good instruction at a time.</h1>
            <p className="relay-summary">
              Everyone sees the same live card. Each cook adds one concrete next move, then passes
              it on.
            </p>
          </div>
          <aside className="relay-room-summary" aria-label="Kitchen status">
            <div className="relay-room-topline">
              <MeshPresence
                count={cookCount}
                label={connectionLabel.replace(/^\d+ /, "")}
                state={room ? "connected" : "connecting"}
                announce="polite"
              />
              <MeshStatusPill tone={room ? "success" : "warning"} dot announce="polite">
                {room ? "Live relay" : "Connecting"}
              </MeshStatusPill>
            </div>
            <p>
              {room
                ? "One instruction per cook. Nothing is silently overwritten."
                : "Your shared room is getting ready."}
            </p>
          </aside>
        </header>

        <section className="relay-workbench" aria-label="Recipe relay workspace">
          <MeshSurface
            as="section"
            tone="accent"
            padding="lg"
            className="relay-composer"
            data-turn-state={turnState}
            aria-labelledby="your-turn-heading"
          >
            <div className="relay-panel-heading">
              <div>
                <p className="relay-panel-kicker">Your station</p>
                <h2 id="your-turn-heading">{turnLabel}</h2>
              </div>
              <span className="relay-turn-index" aria-label={`${entries.length + 1}th instruction`}>
                {String(entries.length + 1).padStart(2, "0")}
              </span>
            </div>

            <MeshNameInput
              label="Cook name"
              value={named.name}
              onChange={named.setName}
              placeholder="Your name"
              maxLength={32}
              showCounter
            />

            {mine ? (
              <div className="relay-locked-step">
                <p className="relay-field-label">Your instruction</p>
                <blockquote>{mine.text}</blockquote>
                <MeshStatusPill tone="success" dot announce="polite">
                  Saved to the shared recipe
                </MeshStatusPill>
              </div>
            ) : (
              <form
                className="relay-step-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitStep();
                }}
              >
                <div className="relay-field-heading">
                  <label htmlFor="step">Next instruction</label>
                  <span aria-live="polite">{draft.length}/220</span>
                </div>
                <textarea
                  id="step"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value.slice(0, 220))}
                  maxLength={220}
                  rows={3}
                  placeholder="Toast the cumin until fragrant."
                />
                <MeshButton
                  type="submit"
                  fullWidth
                  size="lg"
                  className="relay-primary-action"
                  data-testid="relay-primary-action"
                  disabled={!myTurn || draft.trim().length < 3}
                >
                  Add instruction
                </MeshButton>
              </form>
            )}
            <p className="relay-turn-detail" role="status">
              {turnDetail}
            </p>
          </MeshSurface>

          <MeshSurface
            as="section"
            tone="raised"
            padding="lg"
            className="relay-recipe"
            aria-labelledby="recipe-heading"
          >
            <div className="relay-panel-heading">
              <div>
                <p className="relay-panel-kicker">The live card</p>
                <h2 id="recipe-heading">Tonight&apos;s recipe</h2>
              </div>
              <span
                className="relay-step-count"
                aria-label={`${entries.length} instructions so far`}
              >
                {entries.length} {entries.length === 1 ? "step" : "steps"}
              </span>
            </div>

            {entries.length ? (
              <ol className="relay-recipe-list" aria-label="Shared recipe instructions">
                {entries.map(([id, step], index) => (
                  <li key={id} data-testid="recipe-step">
                    <span className="relay-step-number" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p>{step.text}</p>
                      <small>{named.nameOf(id) || `Cook ${id.slice(0, 5)}`}</small>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="relay-empty-card">
                <span className="relay-empty-number" aria-hidden="true">
                  01
                </span>
                <p>The first clear instruction starts the recipe.</p>
                <small>When it is your turn, write the next useful move.</small>
              </div>
            )}

            <div className="relay-recipe-footer">
              <p>Keep it practical: one action, one card, one shared source of truth.</p>
              <MeshButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={share}
                disabled={!entries.length}
              >
                {copied ? "Recipe copied" : "Copy recipe"}
              </MeshButton>
            </div>
          </MeshSurface>
        </section>
      </div>
    </main>
  );
}
