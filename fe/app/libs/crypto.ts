
async function generateSalt(): Promise<Uint8Array> {
  return crypto.getRandomValues(new Uint8Array(16));
}

async function hashPasswordWithSalt(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000, 
      hash: "SHA-256"
    } as Pbkdf2Params,
    keyMaterial,
    256 
  );
  
  return new Uint8Array(derivedBits);
}

function arrayBufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToArrayBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await generateSalt();
  const hash = await hashPasswordWithSalt(password, salt);
  
  const saltHex = arrayBufferToHex(salt);
  const hashHex = arrayBufferToHex(hash);
  
  return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    const [saltHex, hashHex] = hashedPassword.split(':');
    if (!saltHex || !hashHex) {
      return false;
    }
    
    const salt = hexToArrayBuffer(saltHex);
    const storedHash = hexToArrayBuffer(hashHex);
    
    const inputHash = await hashPasswordWithSalt(password, salt);
    
    if (inputHash.length !== storedHash.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < inputHash.length; i++) {
      result |= inputHash[i] ^ storedHash[i];
    }
    
    return result === 0;
  } catch (error) {
    console.error("Fail to verify password:", error);
    return false;
  }
}
