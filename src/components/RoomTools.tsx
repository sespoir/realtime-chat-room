import { RotateCcw, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ClientGameMessage, GomokuState } from '../../shared/chat';

type RpsChoice = 'rock' | 'paper' | 'scissors';

type RoomToolsProps = {
  disabled: boolean;
  gomoku: GomokuState | null;
  onGameAction: (message: ClientGameMessage) => boolean;
  onSend: (text: string) => boolean;
};

const boardSize = 15;
const totalCells = boardSize * boardSize;
const emptyBoard = Array(totalCells).fill(null) as GomokuState['board'];

export default function RoomTools({
  disabled,
  gomoku,
  onGameAction,
  onSend,
}: RoomToolsProps) {
  const [coinResult, setCoinResult] = useState('等待抛硬币');
  const [diceResult, setDiceResult] = useState('等待掷骰子');
  const board = gomoku?.board ?? emptyBoard;

  const boardStatus = useMemo(() => {
    if (!gomoku) {
      return '等待同步棋盘';
    }
    if (gomoku.winner) {
      return `${gomoku.winner === 'black' ? '黑子' : '白子'}获胜`;
    }
    return `轮到${gomoku.turn === 'black' ? '黑子' : '白子'}`;
  }, [gomoku]);

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

  function playRps(choice: RpsChoice) {
    onGameAction({
      type: 'game',
      action: 'rps_play',
      choice,
    });
  }

  function placeStone(index: number) {
    if (disabled || board[index] || gomoku?.winner) {
      return;
    }

    onGameAction({
      type: 'game',
      action: 'gomoku_place',
      index,
    });
  }

  function resetBoard() {
    onGameAction({
      type: 'game',
      action: 'gomoku_reset',
    });
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

      <section className="tool-card">
        <div className="tool-heading">
          <Sparkles size={17} />
          <div>
            <h2>石头剪刀布</h2>
            <p>和系统快速来一局</p>
          </div>
        </div>
        <div className="rps-actions">
          <button type="button" disabled={disabled} onClick={() => playRps('rock')}>✊ 石头</button>
          <button type="button" disabled={disabled} onClick={() => playRps('scissors')}>✌️ 剪刀</button>
          <button type="button" disabled={disabled} onClick={() => playRps('paper')}>✋ 布</button>
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
        <div className="gomoku-board" role="grid" aria-label="同步五子棋棋盘">
          {board.map((cell, index) => (
            <button
              aria-label={`第 ${index + 1} 格`}
              className={`gomoku-cell ${cell ?? ''}`}
              disabled={disabled || Boolean(cell) || Boolean(gomoku?.winner)}
              key={index}
              onClick={() => placeStone(index)}
              type="button"
            >
              {cell ? <span /> : null}
            </button>
          ))}
        </div>
        <p className="tool-note">棋盘现在会同步到同房间所有在线用户，胜负结果也会广播到聊天。</p>
      </section>
    </aside>
  );
}
