import fs from 'fs';
const code = "import React, { useState, useEffect } from 'react';\n" +
"import { motion, AnimatePresence } from 'framer-motion';\n" +
"import { Shield, Info, ArrowLeft, Trophy } from 'lucide-react';\n" +
"import { useNavigate } from 'react-router-dom';\n" +
"import { useAuthStore } from '@/features/authStore';\n" +
"import { secureUpdateTokens, secureRecordGameResult } from '@/lib/secureEconomy';\n" +
"import { Button } from '@/components/ui/Button';\n" +
"import toast from 'react-hot-toast';\n" +
"\n" +
"type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';\n" +
"type Value = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';\n" +
"\n" +
"interface Card {\n" +
"  suit: Suit;\n" +
"  value: Value;\n" +
"}\n" +
"\n" +
"type BetType = 'player' | 'banker' | 'tie' | null;\n" +
"\n" +
"const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as Suit[];\n" +
"const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as Value[];\n" +
"\n" +
"const getCardValue = (val: Value): number => {\n" +
"  if (['10', 'J', 'Q', 'K'].includes(val)) return 0;\n" +
"  if (val === 'A') return 1;\n" +
"  return parseInt(val);\n" +
"};\n" +
"\n" +
"const calculateScore = (cards: Card[]): number => {\n" +
"  const total = cards.reduce((sum, card) => sum + getCardValue(card.value), 0);\n" +
"  return total % 10;\n" +
"};\n" +
"\n" +
"const getRandomCard = (): Card => ({\n" +
"  suit: SUITS[Math.floor(Math.random() * SUITS.length)],\n" +
"  value: VALUES[Math.floor(Math.random() * VALUES.length)]\n" +
"});\n" +
"\n" +
"export default function BaccaratGame() {\n" +
"  const navigate = useNavigate();\n" +
"  const { profile } = useAuthStore();\n" +
"  \n" +
"  const [betAmount, setBetAmount] = useState(10);\n" +
"  const [betType, setBetType] = useState<BetType>(null);\n" +
"  \n" +
"  const [playerCards, setPlayerCards] = useState<Card[]>([]);\n" +
"  const [bankerCards, setBankerCards] = useState<Card[]>([]);\n" +
"  \n" +
"  const [gameState, setGameState] = useState<'betting' | 'dealing' | 'result'>('betting');\n" +
"  const [result, setResult] = useState<'player' | 'banker' | 'tie' | null>(null);\n" +
"  const [payout, setPayout] = useState(0);\n" +
"\n" +
"  const handleDeal = async () => {\n" +
"    if (!profile) return;\n" +
"    if (!betType) {\n" +
"      toast.error('Please select a bet type');\n" +
"      return;\n" +
"    }\n" +
"    if (profile.tokens < betAmount) {\n" +
"      toast.error('Insufficient tokens');\n" +
"      return;\n" +
"    }\n" +
"\n" +
"    try {\n" +
"      const success = await secureUpdateTokens(profile.id, -betAmount, 'Baccarat Bet');\n" +
"      if (!success) throw new Error('Transaction failed');\n" +
"\n" +
"      setGameState('dealing');\n" +
"      \n" +
"      const p1 = getRandomCard();\n" +
"      const b1 = getRandomCard();\n" +
"      const p2 = getRandomCard();\n" +
"      const b2 = getRandomCard();\n" +
"\n" +
"      setPlayerCards([p1]);\n" +
"      setTimeout(() => setBankerCards([b1]), 500);\n" +
"      setTimeout(() => setPlayerCards([p1, p2]), 1000);\n" +
"      setTimeout(() => {\n" +
"        setBankerCards([b1, b2]);\n" +
"        resolveGame([p1, p2], [b1, b2]);\n" +
"      }, 1500);\n" +
"    } catch (e) {\n" +
"      toast.error('Failed to place bet');\n" +
"      setGameState('betting');\n" +
"    }\n" +
"  };\n" +
"\n" +
"  const resolveGame = (pCards: Card[], bCards: Card[]) => {\n" +
"    let pScore = calculateScore(pCards);\n" +
"    let bScore = calculateScore(bCards);\n" +
"\n" +
"    if (pScore >= 8 || bScore >= 8) {\n" +
"      finishGame(pCards, bCards);\n" +
"      return;\n" +
"    }\n" +
"\n" +
"    let pThirdCard: Card | null = null;\n" +
"    let newPCards = [...pCards];\n" +
"    let newBCards = [...bCards];\n" +
"\n" +
"    if (pScore <= 5) {\n" +
"      pThirdCard = getRandomCard();\n" +
"      newPCards.push(pThirdCard);\n" +
"      pScore = calculateScore(newPCards);\n" +
"      setTimeout(() => setPlayerCards([...newPCards]), 1000);\n" +
"    }\n" +
"\n" +
"    let bankerDraws = false;\n" +
"    if (!pThirdCard) {\n" +
"      if (bScore <= 5) bankerDraws = true;\n" +
"    } else {\n" +
"      const p3Val = getCardValue(pThirdCard.value);\n" +
"      if (bScore <= 2) bankerDraws = true;\n" +
"      else if (bScore === 3 && p3Val !== 8) bankerDraws = true;\n" +
"      else if (bScore === 4 && p3Val >= 2 && p3Val <= 7) bankerDraws = true;\n" +
"      else if (bScore === 5 && p3Val >= 4 && p3Val <= 7) bankerDraws = true;\n" +
"      else if (bScore === 6 && (p3Val === 6 || p3Val === 7)) bankerDraws = true;\n" +
"    }\n" +
"\n" +
"    if (bankerDraws) {\n" +
"      const delay = pThirdCard ? 2000 : 1000;\n" +
"      setTimeout(() => {\n" +
"        const bThirdCard = getRandomCard();\n" +
"        newBCards.push(bThirdCard);\n" +
"        setBankerCards([...newBCards]);\n" +
"        finishGame(newPCards, newBCards);\n" +
"      }, delay);\n" +
"    } else {\n" +
"      const delay = pThirdCard ? 2000 : 1000;\n" +
"      setTimeout(() => finishGame(newPCards, newBCards), delay);\n" +
"    }\n" +
"  };\n" +
"\n" +
"  const finishGame = async (pCards: Card[], bCards: Card[]) => {\n" +
"    const pScore = calculateScore(pCards);\n" +
"    const bScore = calculateScore(bCards);\n" +
"    \n" +
"    let winner: 'player' | 'banker' | 'tie';\n" +
"    if (pScore > bScore) winner = 'player';\n" +
"    else if (bScore > pScore) winner = 'banker';\n" +
"    else winner = 'tie';\n" +
"\n" +
"    setResult(winner);\n" +
"    \n" +
"    let winAmount = 0;\n" +
"    if (winner === betType) {\n" +
"      if (winner === 'tie') winAmount = betAmount * 9;\n" +
"      else if (winner === 'banker') winAmount = betAmount * 1.95;\n" +
"      else winAmount = betAmount * 2;\n" +
"    } else if (winner === 'tie' && betType !== 'tie') {\n" +
"      winAmount = betAmount;\n" +
"    }\n" +
"\n" +
"    if (profile) {\n" +
"      await secureRecordGameResult({\n" +
"        userId: profile.id,\n" +
"        gameId: 'baccarat',\n" +
"        betAmount,\n" +
"        winAmount,\n" +
"        multiplier: winAmount / betAmount\n" +
"      });\n" +
"    }\n" +
"    \n" +
"    setPayout(winAmount);\n" +
"    setGameState('result');\n" +
"  };\n" +
"\n" +
"  const resetGame = () => {\n" +
"    setPlayerCards([]);\n" +
"    setBankerCards([]);\n" +
"    setGameState('betting');\n" +
"    setResult(null);\n" +
"    setPayout(0);\n" +
"  };\n" +
"\n" +
"  const renderCard = (card: Card, index: number) => {\n" +
"    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';\n" +
"    const suitSymbol = { hearts: '?', diamonds: '?', clubs: '?', spades: '?' }[card.suit];\n" +
"    \n" +
"    return (\n" +
"      <motion.div\n" +
"        key={'card-' + index}\n" +
"        initial={{ opacity: 0, x: 100, y: -100, rotateY: 180 }}\n" +
"        animate={{ opacity: 1, x: 0, y: 0, rotateY: 0 }}\n" +
"        className={'w-24 h-36 bg-white rounded-xl border border-gray-200 shadow-xl flex flex-col justify-between p-2 absolute ' + (isRed ? 'text-red-500' : 'text-gray-900')}\n" +
"        style={{ left: (index * 30) + 'px', zIndex: index }}\n" +
"      >\n" +
"        <div className=\"text-xl font-bold\">{card.value}</div>\n" +
"        <div className=\"text-5xl self-center\">{suitSymbol}</div>\n" +
"        <div className=\"text-xl font-bold self-end rotate-180\">{card.value}</div>\n" +
"      </motion.div>\n" +
"    );\n" +
"  };\n" +
"\n" +
"  return (\n" +
"    <div className=\"min-h-screen bg-navy-900 pt-24 pb-12 px-4 relative overflow-hidden\">\n" +
"      <div className=\"max-w-4xl mx-auto relative z-10\">\n" +
"        <button \n" +
"          onClick={() => navigate('/games')}\n" +
"          className=\"flex items-center gap-2 text-text-secondary hover:text-white mb-8 transition-colors\"\n" +
"        >\n" +
"          <ArrowLeft size={20} />\n" +
"          Back to Games\n" +
"        </button>\n" +
"\n" +
"        <div className=\"text-center mb-8\">\n" +
"          <h1 className=\"text-4xl font-black text-white mb-4\">Baccarat</h1>\n" +
"        </div>\n" +
"\n" +
"        <div className=\"bg-navy-800/50 border border-navy-700 rounded-3xl p-8 mb-8 backdrop-blur-xl\">\n" +
"          <div className=\"grid grid-cols-2 gap-8 mb-16\">\n" +
"            <div className=\"relative h-40\">\n" +
"              <h3 className=\"text-xl font-bold text-white mb-4 text-center\">\n" +
"                Player {gameState === 'result' && <span className=\"bg-navy-700 px-3 py-1 rounded-full text-brand-400\">{calculateScore(playerCards)}</span>}\n" +
"              </h3>\n" +
"              <div className=\"relative flex justify-center h-full\">\n" +
"                <AnimatePresence>\n" +
"                  {playerCards.map((card, i) => renderCard(card, i))}\n" +
"                </AnimatePresence>\n" +
"              </div>\n" +
"            </div>\n" +
"            \n" +
"            <div className=\"relative h-40\">\n" +
"              <h3 className=\"text-xl font-bold text-white mb-4 text-center\">\n" +
"                Banker {gameState === 'result' && <span className=\"bg-navy-700 px-3 py-1 rounded-full text-brand-400\">{calculateScore(bankerCards)}</span>}\n" +
"              </h3>\n" +
"              <div className=\"relative flex justify-center h-full\">\n" +
"                <AnimatePresence>\n" +
"                  {bankerCards.map((card, i) => renderCard(card, i))}\n" +
"                </AnimatePresence>\n" +
"              </div>\n" +
"            </div>\n" +
"          </div>\n" +
"\n" +
"          <AnimatePresence mode=\"wait\">\n" +
"            {gameState === 'result' && (\n" +
"              <motion.div \n" +
"                initial={{ opacity: 0, scale: 0.8 }}\n" +
"                animate={{ opacity: 1, scale: 1 }}\n" +
"                exit={{ opacity: 0 }}\n" +
"                className=\"text-center mb-8 bg-navy-900/80 py-6 rounded-2xl border border-brand-500/30\"\n" +
"              >\n" +
"                <div className=\"text-3xl font-black text-white mb-2 uppercase tracking-widest\">\n" +
"                  {result === 'tie' ? 'Tie' : result + ' Wins'}\n" +
"                </div>\n" +
"                {payout > 0 ? (\n" +
"                  <div className=\"text-emerald-400 text-xl font-bold\">\n" +
"                    +{Math.floor(payout).toLocaleString()} Tokens\n" +
"                  </div>\n" +
"                ) : (\n" +
"                  <div className=\"text-text-secondary text-lg\">Better luck next time!</div>\n" +
"                )}\n" +
"              </motion.div>\n" +
"            )}\n" +
"          </AnimatePresence>\n" +
"\n" +
"          <div className=\"max-w-md mx-auto space-y-6\">\n" +
"            <div className=\"grid grid-cols-3 gap-4\">\n" +
"              <button\n" +
"                disabled={gameState !== 'betting'}\n" +
"                onClick={() => setBetType('player')}\n" +
"                className={'p-4 rounded-xl border-2 transition-all ' + (betType === 'player' ? 'border-brand-500 bg-brand-500/20 text-white' : 'border-navy-600 bg-navy-700/50 text-text-secondary hover:border-brand-500/50')}\n" +
"              >\n" +
"                <div className=\"font-bold mb-1\">Player</div>\n" +
"                <div className=\"text-sm opacity-80\">1:1</div>\n" +
"              </button>\n" +
"              <button\n" +
"                disabled={gameState !== 'betting'}\n" +
"                onClick={() => setBetType('tie')}\n" +
"                className={'p-4 rounded-xl border-2 transition-all ' + (betType === 'tie' ? 'border-emerald-500 bg-emerald-500/20 text-white' : 'border-navy-600 bg-navy-700/50 text-text-secondary hover:border-emerald-500/50')}\n" +
"              >\n" +
"                <div className=\"font-bold mb-1\">Tie</div>\n" +
"                <div className=\"text-sm opacity-80\">8:1</div>\n" +
"              </button>\n" +
"              <button\n" +
"                disabled={gameState !== 'betting'}\n" +
"                onClick={() => setBetType('banker')}\n" +
"                className={'p-4 rounded-xl border-2 transition-all ' + (betType === 'banker' ? 'border-purple-500 bg-purple-500/20 text-white' : 'border-navy-600 bg-navy-700/50 text-text-secondary hover:border-purple-500/50')}\n" +
"              >\n" +
"                <div className=\"font-bold mb-1\">Banker</div>\n" +
"                <div className=\"text-sm opacity-80\">0.95:1</div>\n" +
"              </button>\n" +
"            </div>\n" +
"\n" +
"            <div className=\"bg-navy-900/50 rounded-xl p-4 flex justify-between items-center border border-navy-700\">\n" +
"              <span className=\"text-text-secondary\">Bet Amount</span>\n" +
"              <div className=\"flex gap-2\">\n" +
"                {[10, 50, 100, 500].map(amount => (\n" +
"                  <button\n" +
"                    key={amount}\n" +
"                    disabled={gameState !== 'betting'}\n" +
"                    onClick={() => setBetAmount(amount)}\n" +
"                    className={'px-4 py-2 rounded-lg font-bold transition-colors ' + (betAmount === amount ? 'bg-brand-500 text-white' : 'bg-navy-700 text-text-secondary hover:bg-navy-600')}\n" +
"                  >\n" +
"                    {amount}\n" +
"                  </button>\n" +
"                ))}\n" +
"              </div>\n" +
"            </div>\n" +
"\n" +
"            {gameState === 'betting' ? (\n" +
"              <Button onClick={handleDeal} className=\"w-full h-14 text-xl\">\n" +
"                Place Bet & Deal\n" +
"              </Button>\n" +
"            ) : gameState === 'result' ? (\n" +
"              <Button onClick={resetGame} className=\"w-full h-14 text-xl bg-navy-700 hover:bg-navy-600\">\n" +
"                Play Again\n" +
"              </Button>\n" +
"            ) : (\n" +
"              <Button disabled className=\"w-full h-14 text-xl\">\n" +
"                Dealing...\n" +
"              </Button>\n" +
"            )}\n" +
"          </div>\n" +
"        </div>\n" +
"      </div>\n" +
"    </div>\n" +
"  );\n" +
"}\n";
fs.writeFileSync('d:/Web App - Aqua Blue/src/components/games/BaccaratGame.tsx', code);
