import re

def fix_chicken():
    with open('src/components/games/ChickenGame.tsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Fix loss (replace upsert with secureRecordGameResult)
    content = re.sub(
        r"await \(supabase\.from\('game_stats'\) as any\)\.upsert\(\{ user_id: profile\.id, games_played: 1, games_won: 0 \}\);",
        "await secureRecordGameResult({ userId: profile.id, betAmount: 0, earnedAmount: 0, xpEarned: Math.floor(betAmount * 0.1) });",
        content
    )
    
    # 2. Fix win (remove upsert, set betAmount: 0)
    content = re.sub(
        r"await secureRecordGameResult\(\{ userId: profile\.id, betAmount: betAmount, earnedAmount: won, xpEarned: Math\.floor\(betAmount \* 0\.1\) \}\);\s*await \(supabase\.from\('game_stats'\) as any\)\.upsert\(\{ user_id: profile\.id, games_played: 1, games_won: 1 \}\);",
        "await secureRecordGameResult({ userId: profile.id, betAmount: 0, earnedAmount: won, xpEarned: Math.floor(betAmount * 0.1) });",
        content
    )
    
    with open('src/components/games/ChickenGame.tsx', 'w', encoding='utf-8') as f:
        f.write(content)


def fix_flip():
    with open('src/components/games/FlipGame.tsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix both issues in FlipGame
    content = re.sub(
        r"await secureRecordGameResult\(\{ userId: profile\.id, betAmount: betAmount, earnedAmount: won \? payout : 0, xpEarned: Math\.floor\(betAmount \* 0\.1\) \}\);\s*await \(supabase\.from\('game_stats'\) as any\)\.upsert\(\{ user_id: profile\.id, games_played: 1, games_won: won \? 1 : 0 \}\);",
        "await secureRecordGameResult({ userId: profile.id, betAmount: 0, earnedAmount: won ? payout : 0, xpEarned: Math.floor(betAmount * 0.1) });",
        content
    )
    
    with open('src/components/games/FlipGame.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

fix_chicken()
fix_flip()
