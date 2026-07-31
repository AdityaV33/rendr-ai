export class AiService {
  async generate(data: any) {
    return { status: "placeholder", message: "generate method not implemented" };
  }

  async refine(data: any) {
    return { status: "placeholder", message: "refine method not implemented" };
  }
}

export const aiService = new AiService();
