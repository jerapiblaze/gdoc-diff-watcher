
async function getAccessToken(env: any) {
    const cached = await env.DOC_CACHE.get("access_token", { type: "json" });
    const now = Math.floor(Date.now() / 1000);
    if (cached && cached.exp > now + 60) return cached.token;

    const key = JSON.parse(env.GCP_SERVICE_ACCOUNT);
    const iat = now;
    const exp = now + 3600;

    const header = {
        alg: "RS256",
        typ: "JWT"
    };

    const payload = {
        iss: key.client_email,
        scope: "https://www.googleapis.com/auth/documents.readonly",
        aud: "https://oauth2.googleapis.com/token",
        iat,
        exp
    };

    const enc = new TextEncoder();
    const toBase64 = (obj: { alg?: string; typ?: string; iss?: any; scope?: string; aud?: string; iat?: number; exp?: number; }) => btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const unsigned = `${toBase64(header)}.${toBase64(payload)}`;

    const keyData = str2ab(key.private_key);
    const cryptoKey = await crypto.subtle.importKey(
        "pkcs8",
        keyData,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, enc.encode(unsigned));
    const jwt = `${unsigned}.${btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")}`;

    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });

    const { access_token, expires_in } = await res.json() as { access_token: string; expires_in: number; };
    await env.DOC_CACHE.put("access_token", JSON.stringify({ token: access_token, exp: now + expires_in }));
    return access_token;
}

function str2ab(pem: string) {
    const b64 = pem.replace(/-----[^-]+-----|\n/g, "");
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

export {
    getAccessToken
}