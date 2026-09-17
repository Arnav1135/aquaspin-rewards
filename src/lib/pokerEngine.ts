export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

export const PokerEngine = {
  createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank });
      }
    }
    return deck;
  },

  shuffle(deck: Card[]): Card[] {
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
  },

  rankValue(rank: Rank): number {
    return RANKS.indexOf(rank) + 2;
  },

  evaluateHand(cards: Card[]): { name: string; score: number } {
    if (cards.length === 0) return { name: 'High Card', score: 0 };
    
    const sorted = [...cards].sort((a, b) => this.rankValue(b.rank) - this.rankValue(a.rank));
    const isFlush = sorted.every(c => c.suit === sorted[0].suit);
    
    let isStraight = true;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (this.rankValue(sorted[i].rank) - 1 !== this.rankValue(sorted[i + 1].rank)) {
        isStraight = false;
        break;
      }
    }

    // Check A-5-4-3-2 straight
    if (!isStraight && sorted[0].rank === 'A' && sorted[1].rank === '5' && sorted[2].rank === '4' && sorted[3].rank === '3' && sorted[4].rank === '2') {
      isStraight = true;
    }

    const counts: Record<string, number> = {};
    for (const c of sorted) {
      counts[c.rank] = (counts[c.rank] || 0) + 1;
    }
    
    const frequencies = Object.values(counts).sort((a, b) => b - a);
    
    if (isStraight && isFlush && sorted[0].rank === 'A' && sorted[1].rank === 'K') return { name: 'Royal Flush', score: 9000 };
    if (isStraight && isFlush) return { name: 'Straight Flush', score: 8000 + this.rankValue(sorted[0].rank) };
    if (frequencies[0] === 4) return { name: 'Four of a Kind', score: 7000 };
    if (frequencies[0] === 3 && frequencies[1] === 2) return { name: 'Full House', score: 6000 };
    if (isFlush) return { name: 'Flush', score: 5000 + this.rankValue(sorted[0].rank) };
    if (isStraight) return { name: 'Straight', score: 4000 + this.rankValue(sorted[0].rank) };
    if (frequencies[0] === 3) return { name: 'Three of a Kind', score: 3000 };
    if (frequencies[0] === 2 && frequencies[1] === 2) return { name: 'Two Pair', score: 2000 };
    if (frequencies[0] === 2) return { name: 'Pair', score: 1000 };
    
    return { name: 'High Card', score: this.rankValue(sorted[0].rank) };
  }
};
