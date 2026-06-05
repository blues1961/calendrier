const encoder = new TextEncoder()
const decoder = new TextDecoder()

function getCryptoApi() {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto est indisponible dans cet environnement.')
  }
  return globalThis.crypto
}

function bytesToBase64(bytes) {
  let binary = ''
  bytes.forEach((value) => {
    binary += String.fromCharCode(value)
  })
  return btoa(binary)
}

function base64ToBytes(value) {
  const binary = atob(value)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function importKeyMaterial(keyMaterial) {
  return getCryptoApi().subtle.importKey('raw', base64ToBytes(keyMaterial), 'AES-GCM', false, [
    'decrypt',
  ])
}

export async function deriveVaultKeyMaterial(passphrase, scope = 'default') {
  if (!passphrase) {
    throw new Error('La phrase de passe du coffre Contact est obligatoire.')
  }

  const cryptoApi = getCryptoApi()
  const baseKey = await cryptoApi.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const derivedBits = await cryptoApi.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(`contacts-vault:${scope}:v1`),
      iterations: 250000,
      hash: 'SHA-256',
    },
    baseKey,
    256,
  )

  return bytesToBase64(new Uint8Array(derivedBits))
}

export async function decryptPrivateFields(payload, keyMaterial) {
  const envelope = typeof payload === 'string' ? JSON.parse(payload) : payload
  const key = await importKeyMaterial(keyMaterial)
  const plaintext = await getCryptoApi().subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64ToBytes(envelope.iv),
    },
    key,
    base64ToBytes(envelope.ciphertext),
  )

  return JSON.parse(decoder.decode(plaintext))
}
