export type RegisterUserInput = {
  email: string;
  password: string;
  captchaToken: string;
};

export type RegisterUserResult = {
  success: boolean;
  message: string;
  status: number;
};

function getFriendlyMessageByStatus(status: number): string {
  if (status === 400) {
    return "Dados inválidos. Verifique as informações e tente novamente.";
  }

  if (status === 429) {
    return "Muitas tentativas. Aguarde um minuto e tente novamente.";
  }

  if (status >= 500) {
    return "Não foi possível concluir o cadastro agora. Tente novamente em instantes.";
  }

  return "Não foi possível concluir o cadastro. Tente novamente.";
}

export async function registerUser(
  input: RegisterUserInput,
): Promise<RegisterUserResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!supabaseUrl || !anonKey) {
    return {
      success: false,
      status: 500,
      message: "Configuração da aplicação incompleta. Contate o suporte.",
    };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/register-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        captchaToken: input.captchaToken,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        message: getFriendlyMessageByStatus(response.status),
      };
    }

    return {
      success: true,
      status: 200,
      message: "Cadastro realizado com sucesso.",
    };
  } catch {
    return {
      success: false,
      status: 500,
      message: "Erro de conexão. Verifique sua internet e tente novamente.",
    };
  }
}
