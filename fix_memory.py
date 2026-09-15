import os
import re

games_dir = "d:/Web App - Aqua Blue/src/components/games"
minigames_file = "d:/Web App - Aqua Blue/src/pages/MiniGames.tsx"

def get_all_files():
    files = [minigames_file]
    for root, _, filenames in os.walk(games_dir):
        for name in filenames:
            if name.endswith('.tsx') or name.endswith('.ts'):
                files.append(os.path.join(root, name))
    return files

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        original = f.read()
    
    content = original

    # 4. Eliminate ANY empty `onClose={() => {}}` handlers.
    content = re.sub(r'onClose=\{\(\)\s*=>\s*\{\s*\}\}', 'onClose={onClose}', content)

    # 5. Cap renderer `devicePixelRatio`
    # if it's WebGLRenderer, change setPixelRatio
    content = re.sub(r'\.setPixelRatio\(.*?devicePixelRatio.*?\)', '.setPixelRatio(Math.min(window.devicePixelRatio, 2))', content)
    
    # if it's Canvas from R3F, make sure it has dpr={Math.min(window.devicePixelRatio, 2)}
    # Instead of complex matching, we inject `dpr={[1, typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1]}`
    if '<Canvas' in content and 'dpr=' not in content:
        content = re.sub(r'<Canvas', '<Canvas dpr={[1, typeof window !== \'undefined\' ? Math.min(window.devicePixelRatio, 2) : 1]}', content)

    # 2. Memory leaks (replace timers with game versions)
    # Check if we should inject imports
    needs_timers = False
    
    if re.search(r'\bsetInterval\(', content):
        content = re.sub(r'\bsetInterval\(', 'gameSetInterval(', content)
        needs_timers = True
    
    if re.search(r'\bsetTimeout\(', content):
        content = re.sub(r'\bsetTimeout\(', 'gameSetTimeout(', content)
        needs_timers = True

    if re.search(r'\brequestAnimationFrame\(', content):
        content = re.sub(r'\brequestAnimationFrame\(', 'gameRequestAnimationFrame(', content)
        needs_timers = True
        
    # addEventListener replacement
    if re.search(r'\bwindow\.addEventListener\(', content):
        content = re.sub(r'\bwindow\.addEventListener\(', 'gameAddEventListener(window, ', content)
        needs_timers = True

    if re.search(r'\bdocument\.addEventListener\(', content):
        content = re.sub(r'\bdocument\.addEventListener\(', 'gameAddEventListener(document, ', content)
        needs_timers = True
        
    if re.search(r'\bthis\.element\.addEventListener\(', content):
        content = re.sub(r'\bthis\.element\.addEventListener\(', 'gameAddEventListener(this.element, ', content)
        needs_timers = True
        
    if re.search(r'\bthis\.container\.addEventListener\(', content):
        content = re.sub(r'\bthis\.container\.addEventListener\(', 'gameAddEventListener(this.container, ', content)
        needs_timers = True
        
    if re.search(r'\bcanvas\.addEventListener\(', content):
        content = re.sub(r'\bcanvas\.addEventListener\(', 'gameAddEventListener(canvas, ', content)
        needs_timers = True

    if re.search(r'\bthis\.renderer\.domElement\.addEventListener\(', content):
        content = re.sub(r'\bthis\.renderer\.domElement\.addEventListener\(', 'gameAddEventListener(this.renderer.domElement, ', content)
        needs_timers = True

    # WebGL dispose
    # For classes with renderer (e.g. Chess3D)
    if 'this.renderer = new THREE.WebGLRenderer' in content or 'new THREE.WebGLRenderer' in content:
        # Check if there's a dispose method, or we add one?
        pass # Too complex for simple regex. We'll handle this manually or let R3F handle it.

    if needs_timers:
        # add import
        import_stmt = "import { gameSetInterval, gameSetTimeout, gameRequestAnimationFrame, gameAddEventListener } from '@/lib/gameTimers';\n"
        if import_stmt not in content:
            # find first import
            match = re.search(r'^(?:import .*\n)+', content, re.MULTILINE)
            if match:
                content = content[:match.end()] + import_stmt + content[match.end():]
            else:
                content = import_stmt + content

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    files = get_all_files()
    count = 0
    for f in files:
        if 'gameTimers.ts' in f or 'fix_memory.py' in f:
            continue
        try:
            if process_file(f):
                count += 1
                print(f"Fixed {f}")
        except Exception as e:
            print(f"Error in {f}: {e}")
    print(f"Modified {count} files.")

if __name__ == '__main__':
    main()
