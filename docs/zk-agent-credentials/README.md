# ZK Agent Credentials — Private Resource Access for AI Agents

> **Carpeta canónica de la iniciativa "credenciales ZK para consumir recursos".**
> Aquí vive todo lo relacionado con el reencuadre de ZKaaS hacia *credenciales de
> acceso anónimas* que permiten a un agente consumir un recurso (inferencia, datos,
> APIs) sin revelar su identidad ni permitir ligar su actividad — verificado en
> Stellar (Soroban).

---

## La idea en una frase

> **Un agente consume un recurso probando que tiene una credencial de acceso válida y
> sin gastar — anónima, no-ligable y de un solo uso (anti-spam / anti-sobreconsumo) —
> verificada con zero-knowledge en Soroban.**

El mecanismo es una **credencial anónima tipo "ficha de arcade"**: comprar = una hoja
`H(secreto)` en un árbol Merkle cuya raíz se publica en Soroban; consumir = una prueba
ZK de pertenencia + revelar un `nullifier`; reusar = el mismo `nullifier` se rechaza
on-chain (doble-gasto bloqueado). Eso último es el control que evita el consumo excesivo.

---

## Qué hay en esta carpeta

| Archivo | Qué es | Estado |
|---|---|---|
| [`HACKATHON.md`](./HACKATHON.md) | One-pager para el hackathon ZK. La idea en 2 minutos. | Listo |
| [`VALUE_PROP.md`](./VALUE_PROP.md) | Propuesta de valor: por qué escala a muchos negocios + verticales. | Listo |
| [`SPEC.md`](./SPEC.md) | Spec técnico completo (arquitectura, circuitos, contrato, demos, despliegue). | Listo (framing credencial) |
| [`BASE_BRIDGE_PLAN.md`](./BASE_BRIDGE_PLAN.md) | Plan para conectarse a los mercados agénticos de **Base + Solana** (x402 + CCTP → Stellar). | **Roadmap, no construido** |
| [`AUDIT.md`](./AUDIT.md) | Auditoría honesta: qué está construido, qué no, y el gap narrativa↔código. | Listo |

---

## Estado en una mirada (resumen — el detalle está en `AUDIT.md`)

- ✅ **Motor desplegado en testnet:** contrato `ZkVerifierRegistry`
  (`CC6YHSKDTINV4XSZNVT42XW4GPJIANNKNNKG73HYTO2OJ7DPF55A33UG`), verificación UltraHonk/BN254
  en Soroban, demo verificada on-chain.
- ✅ **Anti-doble-gasto on-chain:** `verify_unique` registra el `nullifier` y rechaza repeticiones (409).
- ✅ **Pago por uso:** endpoint `/api/v1/zk/verify` detrás de x402 (0.001 USDC).
- ⚠️ **Gap principal:** el circuito desplegado es `reputation_v1` (hoja = *tier de reputación*),
  no existe aún `access_credential_v1` (hoja = *credencial de acceso pagada*). Mismo motor,
  falta especializar.
- ⚠️ **El nullifier está ligado al `context`**, no a la credencial — semántica de "reputación",
  no de "ficha de un solo uso global". Ver `AUDIT.md` §2.
- ⚠️ **"Consumir el recurso" no está cableado:** el endpoint devuelve `{ verified }`, no
  sirve inferencia real tras verificar.
- ⛔ **Base/Solana: 0% construido.** El x402 actual solo entiende Stellar+mock. `BASE_BRIDGE_PLAN.md`
  es diseño post-hackathon.

---

## Procedencia (de dónde salió esto)

- Conversación de diseño del **2026-06-16** (memoria `project_base_agent_marketplace_strategy`).
- Reencuadre documental en la rama `docs/private-access-reframe` (commits `f2cfbee`, `7718411`),
  **consolidado aquí** el 2026-06-27.
- El código del reencuadre (`verify_unique`, ruteo `reputation_v1`→`verify_unique`) ya está
  mergeado en `main`/`feat/wave6` (`337d705`, `0baa136`, `3c7c72d`).

> El antiguo `docs/ZK-as-a-Service/` queda como histórico (framing previo de "reputación
> pública vs privada"). Esta carpeta es la fuente de verdad de la iniciativa de credenciales.
