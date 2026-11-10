export const CONNECTION_ERROR_MESSAGE =
  "Houve uma falha de conexão com o servidor. Tente novamente mais tarde.";

export async function parseErrorResponse(response: Response) {
  const body = await response.json().catch(() => null);

  if (body?.message) {
    return `${body.message} ${body.action ?? ""}`.trim();
  }

  return "Ocorreu um erro inesperado. Tente novamente mais tarde.";
}
