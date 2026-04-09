import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * JWT authentication middleware.
 * Decorates request with `user` containing { id, stellar_address }.
 */
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or missing JWT token' });
  }
}

/**
 * Extend Fastify's type system to include the JWT user payload.
 */
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; stellar_address: string };
    user: { id: string; stellar_address: string };
  }
}
