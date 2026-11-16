'use strict';
/* NEXT (15 Nov 2026): unlock with the phone's own fingerprint or face (WebAuthn, the same check the phone uses for apps).
   Nothing leaves the phone: the app only keeps the id of a key the phone made, and asks the phone "is this the owner?".
   Shared by Teacher and Budget (each keeps its own key: BIO.make(app)). */
const BIO = {
  make(app) {
    const K = app + '-bio';
    const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
    const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
    const rnd = (n) => crypto.getRandomValues(new Uint8Array(n));
    return {
      on: () => { try { return !!localStorage.getItem(K); } catch (e) { return false; } },
      async can() { try { return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch (e) { return false; } },
      async setup() {
        const cred = await navigator.credentials.create({ publicKey: { challenge: rnd(32), rp: { name: app === 'teacher' ? 'Teacher' : 'Budget' }, user: { id: rnd(16), name: app, displayName: app === 'teacher' ? 'Teacher app' : 'Budget app' },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' }, timeout: 60000 } });
        localStorage.setItem(K, b64(cred.rawId)); return true;
      },
      off() { try { localStorage.removeItem(K); } catch (e) { /* none */ } },
      async check() {
        const id = localStorage.getItem(K); if (!id) return false;
        try { const r = await navigator.credentials.get({ publicKey: { challenge: rnd(32), allowCredentials: [{ type: 'public-key', id: unb64(id) }], userVerification: 'required', timeout: 60000 } }); return !!r; } catch (e) { return false; }
      },
    };
  },
};
