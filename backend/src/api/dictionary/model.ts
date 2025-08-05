import mongoose from 'mongoose';

// 更新接口定义，支持更丰富的数据结构
export interface IDictionary extends mongoose.Document {
  word: string;          // 搜索的单词
  originalWord?: string; // 原始单词（处理派生词情况）
  entries: any;          // 保持灵活性
  phonetics?: any[];     // 发音信息
  stems?: string[];      // 相关词形
  source: string;        // 数据来源
  created_at: Date;
  updated_at: Date;
}

const dictionarySchema = new mongoose.Schema<IDictionary>(
  {
    word: { type: String, required: true, index: true },
    originalWord: { type: String, index: true },
    entries: mongoose.Schema.Types.Mixed,
    phonetics: [mongoose.Schema.Types.Mixed],
    stems: [String],
    source: { type: String, default: 'Merriam-Webster' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// 创建复合索引，支持查询派生词
dictionarySchema.index({ word: 1, originalWord: 1 });

export const Dictionary = mongoose.model<IDictionary>('Dictionary', dictionarySchema);
