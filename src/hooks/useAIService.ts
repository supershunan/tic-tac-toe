import { PiecesMapType } from '../game/type/index';
import usePieces from './usePieces';
import { BOARD_COUNT } from '../game-setting';

/**
 * @param score 分数
 * @param counts 各个方向的信息总数
 */
interface boardCountInfo {
    score: number;
    counts: typeof BOARD_COUNT;
}
/**
 * @param row 横坐标
 * @param col 纵坐标
 * @param score 最佳分数
 */
interface bestMoveProps {
    row?: number;
    col?: number;
    score: number;
}

const EMPTY_CELL = '-';
let DEPTH = 2;
let PLAYER_CURRENT: string;
let PLAYER_OPPONENT: string;

/**
 * 计算AI的下棋位置
 * @param board 棋盘数组
 * @param isFirstAI AI是否先手
 * @returns { row: number, col: number }
 */
const useAIService = (board: PiecesMapType, isFirstAI: boolean): { row: number, col: number } => {
    // 将 Map 类型的前数据转换为数组结构
    const newBoads = convertToBoard(board);
    // 当前玩家类型
    PLAYER_CURRENT = isFirstAI ? 'X' : 'O';
    // 对手玩家类型
    PLAYER_OPPONENT = !isFirstAI ? 'X' : 'O';
    // 如果出现一次就能赢的局面
    const emptyCells = getAvailableBoards(newBoads);
    if (emptyCells.length <= 5) {
        for (const move of emptyCells) {
            const { row, col } = move;
            newBoads[row][col] = PLAYER_CURRENT;
            if (usePieces(board, 3, 3, [row, col])) {
                return { row, col };
            }
            newBoads[row][col] = EMPTY_CELL;
        }
    }
    const bestMove = minimax(newBoads, true, -Infinity, Infinity, DEPTH);
    const { row, col } = bestMove;
    DEPTH += 1;
    return { row: row as number, col: col as number };
};

/**
 * 递归的剪枝算法
 * @param board 棋盘数组
 * @param maximizingPlayer 当前下棋者，以AI的视角评估下棋者
 * @param alpha  α 当前节点的权重
 * @param beta   β 对方节点的权重
 * @param depth 递归深度
 * @returns { row, col, score } 最佳AI点位
 */
const minimax = (board: Array<Array<string>>, maximizingPlayer: boolean, alpha: number, beta: number, depth: number): bestMoveProps => {
    // 递归跳出
    const emptyCells = getAvailableBoards(board);
    if (depth === 0 || isGameOver(board) || emptyCells.length === 0) {
        return { score: evaluateBoard(board) };
    }

    let bestMove = null;
    if (maximizingPlayer) {
        // 当前落子
        bestMove = { score: -Infinity };
        for (const move of emptyCells) {
            const { row, col } = move;
            board[row][col] = PLAYER_CURRENT;
            const currentMoce = minimax(board, false, alpha, beta, depth - 1);
            board[row][col] = EMPTY_CELL;
            currentMoce.row = row;
            currentMoce.col = col;
            bestMove = currentMoce.score > bestMove.score ? currentMoce : bestMove;
            alpha = Math.max(alpha, bestMove.score);
            if (alpha >= beta) {
                break;
            }
        }
    } else {
        // 对方落子
        bestMove = { score: Infinity };
        for (const move of emptyCells) {
            const { row, col } = move;
            board[row][col] = PLAYER_OPPONENT;
            const currentMoce = minimax(board, true, alpha, beta, depth - 1);
            board[row][col] = EMPTY_CELL;
            currentMoce.row = row;
            currentMoce.col = col;
            bestMove = currentMoce.score < bestMove.score ? currentMoce : bestMove;
            beta = Math.min(beta, bestMove.score);
            if (alpha >= beta) {
                break;
            }
        }
    }
    return bestMove;
};

/**
 * 判断游戏是否结束
 * @param board 棋盘数组
 * @returns 游戏进行程度
 */
const isGameOver = (board: Array<Array<string>>): boolean => {
    if (checkWinner(board) === EMPTY_CELL) return false;
    return true;
};

/**
 * 使用位运算法检查胜负（仅适用于井字棋）
 * @param board 棋盘数组
 * @returns string 获胜结果
 */
const checkWinner = (board: Array<Array<string>>) => {
    const winningCombinations = [
        // 横向获胜组合
        [[0, 0], [0, 1], [0, 2]],
        [[1, 0], [1, 1], [1, 2]],
        [[2, 0], [2, 1], [2, 2]],
        // 纵向获胜组合
        [[0, 0], [1, 0], [2, 0]],
        [[0, 1], [1, 1], [2, 1]],
        [[0, 2], [1, 2], [2, 2]],
        // 对角线获胜组合
        [[0, 0], [1, 1], [2, 2]],
        [[0, 2], [1, 1], [2, 0]],
    ];

    for (const combination of winningCombinations) {
        const [aa, bb, cc] = combination;
        const playerA = board[aa[0]][aa[1]];
        const playerB = board[bb[0]][bb[1]];
        const playerC = board[cc[0]][cc[1]];

        if (playerA && playerA === playerB && playerA === playerC) {
            // 返回获胜的玩家
            return playerA;
        }
    }
    // 没有获胜者
    return EMPTY_CELL;
};

/**
 * 估值函数
 * @param board 棋盘数组
 * @returns 当前局面的得分
 */
const evaluateBoard = (board: Array<Array<string>>): number => {
    const { counts: countsCurrent, score: scoreCurrent } = countsPlayer(board, PLAYER_CURRENT);
    const { counts: countsOpponent, score: scoreOpponent } = countsPlayer(board, PLAYER_OPPONENT);

    // 将当前棋盘信息扁平化为一维数组
    const countsCurrentArr: Array<string> =
        `${countsCurrent.horizontal.join('')}${countsCurrent.vertical.join('')}${countsCurrent.diagonal.join('')}`.split('');
    const countsOpponentArr: Array<string> =
        `${countsOpponent.horizontal.join('')}${countsOpponent.vertical.join('')}${countsOpponent.diagonal.join('')}`.split('');

    // 当前棋盘己方和对方的位置信息进行相减得到新的评估数组
    const countsSubArr = countsCurrentArr.map((count, index) => {
        return Number(count) - Number(countsOpponentArr[index]);
    });

    const score = scoreCurrent + nextPlayerIsWin(countsSubArr);
    return score - scoreOpponent;
};

/**
 * 计算各个位置的评估分数
 * @param board 棋盘数组
 * @param player 玩家类型
 * @returns 当前玩家局面分数
 */
const countsPlayer = (board: Array<Array<string>>, player: string): boardCountInfo => {
    const counts = {
        horizontal: [0, 0, 0], // 水平
        vertical: [0, 0, 0],   // 垂直
        diagonal: [0, 0],      // 对角线
        cornerControl: 0,      // 控制的角落位置
        centerControl: 0,      // 中心位置控制
    };
    /**
     * 计算当前棋盘位置的信息
     * @param row
     * @param col
     * @param property 索引key
     * @param value 数组的key
     */
    const addToCounts = (row: number, col: number, property: keyof typeof counts, value: number) => {
        (counts[property] as number[])[value] += 1;
    };

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            if (board[row][col] === player) {
                addToCounts(row, col, 'horizontal', row);
                addToCounts(row, col, 'vertical', col);
                if (row === col) {
                    addToCounts(row, col, 'diagonal', 0);
                }
                if (row + col === 2) {
                    addToCounts(row, col, 'diagonal', 1);
                }
                if ((row === 0 || row === 2) && (col === 0 || col === 2)) {
                    counts.cornerControl++;
                }
                if (row === 1 && col === 1) {
                    counts.centerControl++;
                }
            }
        }
    }

    /**
     * 为当前棋盘增加评估分数10次方
     * @param property 索引key
     * @param factor 给评估值进行放大的倍数
     * @returns number
     */
    const calculateScore = (property: keyof typeof counts, factor: number): number => {
        return (counts[property] as number[]).reduce((acc: number, count: number) => acc + Math.pow(10, count), 0) * factor;
    };

    const score = calculateScore('horizontal', 1) +
                 calculateScore('vertical', 1) +
                 calculateScore('diagonal', 1) +
                 (5 * counts.cornerControl) +
                 (10 * counts.centerControl);

    return { counts, score };
};

/**
 *  通过递归奇偶，为AI赋值高权重
 * @param countsSubArr 己方连子数减去对方连子数形成的数组
 * @returns 增加的局面分数
 */
const nextPlayerIsWin = (countsSubArr: Array<number>): number => {
    if (DEPTH % 2 === 0 && (countsSubArr.includes(2) || countsSubArr.includes(3))) return 50;
    if (DEPTH % 2 !== 0 && (countsSubArr.includes(-2) || countsSubArr.includes(-3))) return -50;
    return 0;
};

/**
 * 获取棋盘的空位
 * @param board 棋盘数组
 * @returns Array<{row: number, col: number}>
 */
const getAvailableBoards = (board: Array<Array<string>>): Array<{row: number, col: number}> => {
    const tempBoards: Array<{row: number, col: number}> = [];
    board.forEach((rowValue, row) => {
        rowValue.forEach((colValue, col) => {
            if (colValue === EMPTY_CELL) tempBoards.push({ row, col });
        });
    });
    return tempBoards;
};

/**
 * 将map类型转换为数组
 * @param boards 棋盘数据
 * @returns  Array<Array<string | null>>
 */
const convertToBoard = (boards: PiecesMapType): Array<Array<string>> => {
    const board = Array.from(Array(3), () => new Array(3).fill('-'));
    for (const values of boards) {
        const [row, col] = values[1].direction;
        board[row][col] = values[1].content;
    }
    return board;
};

export default useAIService;
