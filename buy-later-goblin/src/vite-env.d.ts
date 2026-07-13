/// <reference types="vite/client" />

type PuterChatResponse = string | { message?: { content?: string } };

declare const puter: {
  ai: {
    chat(prompt: string, options?: { model?: string; temperature?: number }): Promise<PuterChatResponse>;
  };
};
