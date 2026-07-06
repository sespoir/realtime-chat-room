import { RotateCcw, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';

type Stone = 'black' | 'white';
type Cell = Stone | null;

type RoomToolsProps = {
  disabled: boolean;
  onSend: (text: string) => boolean;
};

const boardSize = 15;
const totalCells = boardSize * boardSize;

function getWinner(board: Cell[], row: number, col: number, stone: Stone) {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  return directions.some(([rowStep, colStep]) => {
    let count = 1;

    for (const direction of [-1, 1]) {
      let nextRow = row + rowStep * direction;
      let nextCol = col + colStep * direction;

      while (
        nextRow >= 0
        && nextRow < boardSize
        && nextCol >= 0
        && nextCol < boardSize
        && board[nextRow * boardSize + nextCol] === stone
      ) {
        count += 1;
        nextRow += rowStep * direction;
        nextCol += colStep * direction;
      }
    }

    return count >= 5;
  });
}

export default function RoomTools({ disabled, onSend }: RoomToolsProps) {
  const [coinResult, setCoinResult] = useState('等待抛硬币');
  const [diceResult, setDiceResult] = useState('等待掷骰子');
  const [board, setBoard] = useState<Cell[]>(() => Array(totalCells).fill(null));
  const [turn, setTurn] = useState<Stone>('black');
  const [winner, setWinner] = useState<Stone | null>(null);

  const boardStatus = useMemo(() => {
    if (winner) {
      return `${winner === 'black' ? '黑子' : '白子'}获胜`;
    }
    return `轮到${turn === 'black' ? '黑子' : '白子'}`;
  }, [turn, winner]);

  function flipCoin() {
    const result = Math.random() > 0.5 ? '正面' : '反面';
    setCoinResult(result);
    onSend(`🪙 抛硬币：${result}`);
  }

  function rollDice() {
    const result = Math.floor(Math.random() * 6) + 1;
    setDiceResult(`${result} 点`);
    onSend(`🎲 掷骰子：${result} 点`);
  }

  function placeStone(index: number) {
    if (board[index] || winner) {
      return;
    }

    const row = Math.floor(index / boardSize);
    const col = index % boardSize;
    const nextBoard = [...board];
    nextBoard[index] = turn;
    setBoard(nextBoard);

    if (getWinner(nextBoard, row, col, turn)) {
      setWinner(turn);
      onSend(`⚫⚪ 五子棋：${turn === 'black' ? '黑子' : '白子'}获胜`);
      return;
    }

    setTurn(turn === 'black' ? 'white' : 'black');
  }

  function resetBoard() {
    setBoard(Array(totalCells).fill(null));
    setTurn('black');
    setWinner(null);
  }

  return (
    <aside className="room-tools" aria-label="房间工具">
      <section className="tool-card">
        <div className="tool-heading">
          <Sparkles size={17} />
          <div>
            <h2>随机小工具</h2>
            <p>结果会同步发到聊天里</p>
          </div>
        </div>
        <div className="random-actions">
          <button type="button" disabled={disabled} onClick={flipCoin}>
            抛硬币
            <strong>{coinResult}</strong>
          </button>
          <button type="button" disabled={disabled} onClick={rollDice}>
            掷骰子
            <strong>{diceResult}</strong>
          </button>
        </div>
      </section>

      <section className="tool-card gomoku-card">
        <div className="tool-heading compact">
          <div>
            <h2>五子棋</h2>
            <p>{boardStatus}</p>
          </div>
          <button className="reset-board" type="button" onClick={resetBoard}>
            <RotateCcw size={15} />
          </button>
        </div>
        <div className="gomoku-board" role="grid" aria-label="本地五子棋棋盘">
          {board.map((cell, index) => (
            <button
              aria-label={`第 ${index + 1} 格`}
              className={`gomoku-cell ${cell ?? ''}`}
              disabled={Boolean(cell) || Boolean(winner)}
              key={index}
              onClick={() => placeStone(index)}
              type="button"
            >
              {cell ? <span /> : null}
            </button>
          ))}
        </div>
        <p className="tool-note">本局棋盘仅在当前设备显示，聊天会广播胜负结果。</p>
      </section>
    </aside>
  );
}
