export async function generateOutcome(serverSeed: string, clientSeed: string, nonce: number, rows: number): Promise<{ path: ('L' | 'R')[], targetBucket: number, hash: string }> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(serverSeed);
  const msgData = encoder.encode(`${clientSeed}:${nonce}`);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, msgData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  const path: ('L' | 'R')[] = [];
  let bucket = 0;
  
  // Consuming 1 byte per row
  for (let i = 0; i < rows; i++) {
    const byte = hashArray[i];
    // Mod 2 yields L/R
    if (byte % 2 === 1) {
      path.push('R');
      bucket += 1;
    } else {
      path.push('L');
    }
  }
  
  return { path, targetBucket: bucket, hash: hashHex };
}
