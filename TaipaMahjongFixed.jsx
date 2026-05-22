import { useState, useEffect, useCallback } from "react";

const SUITS = ["筒", "萬", "索"];
const SUIT_COLOR = {
  筒: "#5eb8f5",
  萬: "#f5705e",
  索: "#5ef57c",
};

const BG = "#091509";
const PANEL = "#0d1e0d";
const GOLD = "#d4a017";

let _uid = 0;

function makeDeck() {
  _uid = 0;
  const d = [];

  for (const suit of SUITS)
    for (let num = 1; num <= 3; num++)
      for (let i = 0; i < 4; i++)
        d.push({
          suit,
          num,
          uid: _uid++,
        });

  return d;
}

function shuffle(arr) {
  const a = [...arr];

  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
}

function chkSet(ts) {
  if (ts.length !== 3) return null;

  const [a, b, c] = ts;

  if (a.suit !== b.suit || b.suit !== c.suit)
    return null;

  const ns = [a.num, b.num, c.num].sort((x, y) => x - y);

  if (ns[0] === ns[1] && ns[1] === ns[2])
    return "triplet";

  if (ns[0] === 1 && ns[1] === 2 && ns[2] === 3)
    return "sequence";

  return null;
}

function chkWin(h) {
  if (h.length !== 6) return null;

  for (let i = 0; i < 4; i++)
    for (let j = i + 1; j < 5; j++)
      for (let k = j + 1; k < 6; k++) {

        const s1 = [h[i], h[j], h[k]];

        const rem = h.filter(
          (_, x) =>
            x !== i &&
            x !== j &&
            x !== k
        );

        const t1 = chkSet(s1);
        const t2 = chkSet(rem);

        if (t1 && t2) {
          return [
            { tiles: s1, type: t1 },
            { tiles: rem, type: t2 },
          ];
        }
      }

  return null;
}

function chkWin6(h6) {
  for (let i = 0; i < h6.length; i++) {
    if (chkWin(h6.filter((_, x) => x !== i)))
      return i;
  }

  return -1;
}

function tenpai(h5) {
  const waits = [];

  for (const suit of SUITS)
    for (let num = 1; num <= 3; num++) {

      const fake = {
        suit,
        num,
        uid: -1,
      };

      if (chkWin6([...h5, fake]) >= 0)
        waits.push({ suit, num });
    }

  return waits;
}

function potential(h) {
  let sc = 0;

  for (let i = 0; i < h.length - 2; i++)
    for (let j = i + 1; j < h.length - 1; j++)
      for (let k = j + 1; k < h.length; k++) {

        const trio = [h[i], h[j], h[k]];

        if (chkSet(trio)) {
          sc += 15;
          continue;
        }

        if (
          trio[0].suit === trio[1].suit &&
          trio[1].suit === trio[2].suit
        ) {
          const ns = trio
            .map(t => t.num)
            .sort((a, b) => a - b);

          if (
            ns[0] === ns[1] ||
            ns[1] === ns[2]
          )
            sc += 5;

          if (
            ns[1] - ns[0] === 1 ||
            ns[2] - ns[1] === 1
          )
            sc += 2;
        }
      }

  return sc;
}

function aiDiscard(h6) {

  const wi = chkWin6(h6);

  if (wi >= 0)
    return wi;

  let best = -1;
  let idx = 0;

  for (let i = 0; i < h6.length; i++) {

    const sc = potential(
      h6.filter((_, x) => x !== i)
    );

    if (sc > best) {
      best = sc;
      idx = i;
    }
  }

  return idx;
}

function Tile({
  tile,
  onClick,
  back,
}) {

  const col = back
    ? "#264026"
    : SUIT_COLOR[tile?.suit];

  return (
    <div
      onClick={onClick}
      style={{
        width: 48,
        height: 68,
        borderRadius: 8,
        background: "#eef9ee",
        border: `2px solid ${col}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {!back && (
        <>
          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: col,
            }}
          >
            {tile.num}
          </div>

          <div
            style={{
              fontSize: 11,
              color: col,
            }}
          >
            {tile.suit}
          </div>
        </>
      )}
    </div>
  );
}

function initGame() {

  const deck = shuffle(makeDeck());

  const pHand = deck.slice(0, 5);
  const aHand = deck.slice(5, 10);

  const wall = deck.slice(10);

  return {
    pHand,
    aHand,
    wall,
    phase: "draw",
    turn: "p",
    pRiichi: false,
    aRiichi: false,
    pDiscard: [],
    aDiscard: [],
    msg: "ゲーム開始！",
  };
}

export default function TaipaMahjong() {

  const [g, setG] = useState(
    () => initGame()
  );

  const [sel, setSel] = useState(-1);

  const upd = useCallback(
    fn => setG(prev => fn(prev)),
    []
  );

  useEffect(() => {

    if (
      g.phase !== "draw" ||
      g.turn !== "p"
    )
      return;

    const t = setTimeout(() => {

      upd(g => {

        if (!g.wall.length)
          return {
            ...g,
            phase: "end",
            msg: "山切れ",
          };

        const [drawn, ...wall] = g.wall;

        return {
          ...g,
          wall,
          pHand: [...g.pHand, drawn],
          phase: "sel",
          msg: "捨て牌を選択",
        };
      });

    }, 300);

    return () => clearTimeout(t);

  }, [g.phase, g.turn, upd]);

  const doDiscard = () => {

    if (sel < 0) return;

    setG(g => {

      const discard = g.pHand[sel];

      const h5 = g.pHand.filter(
        (_, i) => i !== sel
      );

      return {
        ...g,
        pHand: h5,
        pDiscard: [
          ...g.pDiscard,
          discard
        ],
        phase: "ai",
        msg: "AIターン",
      };
    });

    setSel(-1);
  };

  useEffect(() => {

    if (g.phase !== "ai")
      return;

    const t = setTimeout(() => {

      upd(g => {

        if (!g.wall.length)
          return {
            ...g,
            phase: "end",
            msg: "山切れ",
          };

        const [drawn, ...wall] = g.wall;

        const h6 = [...g.aHand, drawn];

        const di = aiDiscard(h6);

        return {
          ...g,
          wall,
          aHand: h6.filter(
            (_, i) => i !== di
          ),
          aDiscard: [
            ...g.aDiscard,
            h6[di]
          ],
          phase: "draw",
          turn: "p",
          msg: "あなたのターン",
        };
      });

    }, 500);

    return () => clearTimeout(t);

  }, [g.phase, upd]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        color: "#fff",
        padding: 20,
      }}
    >
      <h1
        style={{
          color: GOLD,
        }}
      >
        タイパ麻雀
      </h1>

      <div
        style={{
          marginBottom: 10,
        }}
      >
        {g.msg}
      </div>

      <div
        style={{
          marginBottom: 20,
        }}
      >
        <div>AI 手牌</div>

        <div
          style={{
            display: "flex",
            gap: 6,
          }}
        >
          {g.aHand.map(t => (
            <Tile
              key={t.uid}
              tile={t}
              back={true}
            />
          ))}
        </div>
      </div>

      <div>
        <div>あなたの手牌</div>

        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 12,
          }}
        >
          {g.pHand.map((t, i) => (
            <Tile
              key={t.uid}
              tile={t}
              onClick={
                g.phase === "sel"
                  ? () => setSel(i)
                  : undefined
              }
            />
          ))}
        </div>

        {g.phase === "sel" && (
          <button
            onClick={doDiscard}
          >
            捨てる
          </button>
        )}
      </div>
    </div>
  );
}
