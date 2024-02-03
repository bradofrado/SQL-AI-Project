declare global {
    namespace NodeJS {
      interface ProcessEnv {
        [key: string]: string | undefined;
        OPEN_AI_KEY: string;
      }
    }
  }