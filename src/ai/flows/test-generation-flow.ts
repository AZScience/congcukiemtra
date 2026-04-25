import { ai } from '../genkit';
import { z } from 'zod';

const QuestionSchema = z.object({
  type: z.enum(['mcq', 'fill']),
  question: z.string(),
  options: z.array(z.string()).optional(),
  correct: z.number().optional(),
  answer: z.string().optional(),
});

const TestOutputSchema = z.object({
  questions: z.array(QuestionSchema),
});

export const testGenerationFlow = ai.defineFlow(
  {
    name: 'testGenerationFlow',
    inputSchema: z.object({
      content: z.string().optional(),
      file: z.object({
        base64: z.string(),
        mimeType: z.string(),
      }).optional(),
      type: z.enum(['mcq', 'fill', 'combined']),
      count: z.number().default(5),
    }),
    outputSchema: TestOutputSchema,
  },
  async (input) => {
    const prompt = `
      Dựa trên nội dung ${input.file ? 'trong tài liệu đính kèm' : 'sau đây'}, hãy tạo một bài kiểm tra gồm ${input.count} câu hỏi.
      Loại đề yêu cầu: ${input.type === 'combined' ? 'Kết hợp cả Trắc nghiệm và Điền khuyết' : input.type === 'mcq' ? 'Toàn bộ là Trắc nghiệm' : 'Toàn bộ là Điền khuyết'}.
      
      ${input.content ? `Nội dung: ${input.content}` : ''}
      
      Yêu cầu định dạng JSON:
      - Trắc nghiệm (mcq): có trường "options" (mảng 4 chuỗi) và "correct" (chỉ số 0-3).
      - Điền khuyết (fill): có trường "answer" (chuỗi đáp án đúng).
    `;

    const { output } = await ai.generate({
      prompt: [
        { text: prompt },
        ...(input.file ? [{ data: { url: `data:${input.file.mimeType};base64,${input.file.base64}` } }] : [])
      ],
      output: { schema: TestOutputSchema },
    });

    if (!output) {
      throw new Error('AI failed to generate test');
    }

    return output;
  }
);
