/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, Sparkles, PenTool, History, Loader2, AlertCircle, 
  Copy, RefreshCw, Check, MousePointer2, Ruler, Moon, Sun, 
  Save, Trash2, Music, Pause, Play, Feather
} from "lucide-react";

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Style = 'classical' | 'modern' | 'poem';
type Length = '3' | '5' | '10';

interface SavedStory {
  id: string;
  title: string;
  content: string;
  style: Style;
  date: string;
}

export default function App() {
  const [background, setBackground] = useState('');
  const [protagonist, setProtagonist] = useState('');
  const [style, setStyle] = useState<Style>('modern');
  const [length, setLength] = useState<Length>('5');
  const [story, setStory] = useState('');
  const [displayedStory, setDisplayedStory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [savedStories, setSavedStories] = useState<SavedStory[]>([]);

  // 초기 데이터 로드 (Dark Mode, Saved Stories)
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedMode);
    if (savedMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    }

    const stories = localStorage.getItem('savedStories');
    if (stories) setSavedStories(JSON.parse(stories));
  }, []);

  // 자연스러운 타이핑 애니메이션 효과
  useEffect(() => {
    if (!story) {
      setDisplayedStory('');
      return;
    }

    setDisplayedStory('');
    let isCancelled = false;

    const typeEffect = async () => {
      let currentText = '';
      setImageUrl(''); // 새로운 이야기가 시작되면 기존 이미지 초기화
      
      for (let i = 0; i < story.length; i++) {
        if (isCancelled) break;
        
        const char = story[i];
        currentText += char;
        setDisplayedStory(currentText);

        // 1. 기본 타이핑 속도: 40ms ~ 90ms 사이의 랜덤한 값 (사람이 치는 느낌)
        let delay = Math.floor(Math.random() * 50) + 40;

        // 2. 문장 마침표 뒤에는 긴 호흡 (400ms ~ 600ms)
        if (['.', '!', '?'].includes(char)) {
          delay = 450 + Math.floor(Math.random() * 150);
        } 
        // 3. 줄바꿈(\n) 시에는 약간의 멈춤 (300ms)
        else if (char === '\n') {
          delay = 300;
        }
        // 4. 쉼표(,) 뒤에도 미세한 멈춤 (150ms)
        else if (char === ',') {
          delay = 150;
        }

        // 설정된 지연 시간만큼 대기
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    };

    typeEffect();

    // 컴포넌트 언마운트나 새로운 스토리 생성 시 이전 애니메이션 취소
    return () => {
      isCancelled = true;
    };
  }, [story]);

  // 다크 모드 변경 감지
  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  // 저장된 이야기 변경 감지
  useEffect(() => {
    localStorage.setItem('savedStories', JSON.stringify(savedStories));
  }, [savedStories]);

  // 복사 성공 메시지 타이머
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const fillExample = () => {
    setBackground('조선 시대');
    setProtagonist('떠돌이 선비');
  };

  const generateImage = async () => {
    if (!story) return;

    setIsImageLoading(true);
    setError('');

    try {
      // 이야기 내용을 바탕으로 시각적 묘사를 위한 프롬프트 생성
      const prompt = `Create a warm, emotional, and artistic illustration based on this story. Style: soft colors, literary atmosphere, detailed scene. Story: ${story}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      let foundImage = false;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64Data = part.inlineData.data;
            setImageUrl(`data:image/png;base64,${base64Data}`);
            foundImage = true;
            break;
          }
        }
      }

      if (!foundImage) {
        throw new Error('이미지를 생성하지 못했습니다.');
      }
    } catch (err) {
      console.error(err);
      setError('이미지 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsImageLoading(false);
    }
  };

  const generateStory = async () => {
    if (!background.trim() || !protagonist.trim()) {
      setError('배경과 주인공을 모두 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');
    setStory('');

    try {
      let prompt = '';
      if (style === 'classical') {
        prompt = `다음 조건으로 고전 문체의 짧은 이야기를 작성하라.
                  * 배경: ${background}
                  * 주인공: ${protagonist}
                  * 특징: 고풍스럽고 옛 문어체 표현 사용
                  * 길이: ${length}문장`;
      } else if (style === 'modern') {
        prompt = `다음 조건으로 현대 소설 스타일의 자연스러운 이야기를 작성해줘.
                  * 배경: ${background}
                  * 주인공: ${protagonist}
                  * 특징: 현실적이고 감정이 드러나는 문장
                  * 길이: ${length}문장`;
      } else if (style === 'poem') {
        prompt = `다음 조건을 바탕으로 감성적인 짧은 시를 작성해줘.
                  * 배경: ${background}
                  * 주인공: ${protagonist}
                  * 분위기: 서정적이고 감성적인 표현
                  * 형식: 4~6행의 자유시`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      if (response.text) {
        setStory(response.text);
      } else {
        throw new Error('이야기를 생성하지 못했습니다.');
      }
    } catch (err) {
      console.error(err);
      setError('이야기를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveStory = () => {
    if (!story) return;
    
    const title = style === 'classical' ? '📜 과거에서 온 이야기' 
                : style === 'modern' ? '📖 현대 속 이야기' 
                : '✍️ 한 편의 시';
                
    const newStory: SavedStory = {
      id: Date.now().toString(),
      title,
      content: story,
      style,
      date: new Date().toLocaleDateString()
    };
    
    setSavedStories([newStory, ...savedStories]);
  };

  const deleteStory = (id: string) => {
    setSavedStories(savedStories.filter(s => s.id !== id));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch (err) {
      console.error('복사 실패:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6 md:p-12 transition-colors duration-300">
      {/* Top Controls */}
      <div className="w-full max-w-4xl flex justify-end items-center mb-8">
        <button 
          onClick={() => setDarkMode(!darkMode)}
          className="p-3 rounded-full bg-stone-200/50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:scale-110 transition-all shadow-sm"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <header className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="inline-block p-3 bg-olive/10 rounded-full mb-4"
          >
            <BookOpen className="w-8 h-8 text-olive" />
          </motion.div>
          <h1 className="title text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            네가 들려주는 이야기
          </h1>
          <p className="text-stone-600 dark:text-stone-400 text-lg italic">
            작은 상상이, 하나의 이야기로
          </p>
        </header>

        {/* Input Card */}
        <div className="card-base rounded-[32px] p-8 md:p-10 mb-8">
          <div className="space-y-6">
            <div className="flex justify-end">
              <button 
                onClick={fillExample}
                className="flex items-center gap-1.5 text-sm font-medium text-olive hover:text-stone-700 dark:hover:text-stone-300 transition-colors bg-olive/5 px-3 py-1.5 rounded-full"
              >
                <MousePointer2 className="w-4 h-4" />
                예시 입력 (조선 시대 선비)
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-500 uppercase tracking-widest mb-2 ml-1">
                이야기의 배경
              </label>
              <div className="relative">
                <History className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input 
                  type="text"
                  placeholder="예: 조선 시대, 현대 도시, 우주 정거장"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  className="input-base w-full pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-olive/20 focus:border-olive outline-none placeholder:text-stone-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-500 uppercase tracking-widest mb-2 ml-1">
                주인공
              </label>
              <div className="relative">
                <PenTool className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input 
                  type="text"
                  placeholder="예: 떠돌이 선비, 형사, 어린 소녀"
                  value={protagonist}
                  onChange={(e) => setProtagonist(e.target.value)}
                  className="input-base w-full pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-olive/20 focus:border-olive outline-none placeholder:text-stone-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-500 uppercase tracking-widest mb-2 ml-1">
                  문체 선택
                </label>
                <select 
                  value={style}
                  onChange={(e) => setStyle(e.target.value as Style)}
                  className="input-base w-full px-4 py-4 rounded-2xl focus:ring-2 focus:ring-olive/20 focus:border-olive outline-none appearance-none cursor-pointer"
                >
                  <option value="modern">📖 현대 소설</option>
                  <option value="classical">📜 고전 문체</option>
                  <option value="poem">✍️ 감성 시</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-500 uppercase tracking-widest mb-2 ml-1">
                  이야기 길이
                </label>
                <div className="relative">
                  <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 pointer-events-none" />
                  <select 
                    value={length}
                    disabled={style === 'poem'}
                    onChange={(e) => setLength(e.target.value as Length)}
                    className="input-base w-full pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-olive/20 focus:border-olive outline-none appearance-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="3">짧게 (3문장)</option>
                    <option value="5">보통 (5문장)</option>
                    <option value="10">길게 (10문장)</option>
                  </select>
                </div>
              </div>
            </div>

            <button 
              onClick={generateStory}
              disabled={isLoading}
              className="w-full py-5 bg-olive hover:bg-stone-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-olive/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                      className="w-2 h-2 bg-white rounded-full"
                    />
                  ))}
                </div>
              ) : (
                <>
                  {style === 'poem' ? <Feather className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                  {style === 'poem' ? '시 생성하기' : '오늘 들려줄 이야기'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Result Area */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 mb-8"
            >
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </motion.div>
          )}

          {story ? (
            <div className="space-y-4 mb-12">
              <motion.div 
                key="story"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="paper-card rounded-[32px] p-8 md:p-12 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-olive/30" />
                
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-px bg-stone-300 dark:bg-stone-600" />
                    <span className="text-base font-bold text-stone-600 dark:text-stone-300 tracking-widest uppercase">
                      {style === 'classical' ? '📜 과거에서 온 이야기' 
                       : style === 'modern' ? '📖 현대 속 이야기' 
                       : '✍️ 한 편의 시'}
                    </span>
                    <div className="w-12 h-px bg-stone-300 dark:bg-stone-600" />
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => copyToClipboard(story)}
                      className="flex items-center gap-1.5 text-xs font-bold text-stone-400 hover:text-olive transition-colors uppercase tracking-widest"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="text-green-500">복사됨</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          복사
                        </>
                      )}
                    </button>
                    <button 
                      onClick={saveStory}
                      className="flex items-center gap-1.5 text-xs font-bold text-stone-400 hover:text-olive transition-colors uppercase tracking-widest"
                    >
                      <Save className="w-4 h-4" />
                      저장
                    </button>
                  </div>
                </div>

                <p className="text-xl md:text-2xl text-stone-800 dark:text-stone-200 leading-[1.8] font-serif whitespace-pre-wrap">
                  {displayedStory}
                  {displayedStory.length < story.length && (
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="inline-block w-1 h-6 bg-olive ml-1 align-middle"
                    />
                  )}
                </p>

                {/* Generated Image Display */}
                <AnimatePresence>
                  {imageUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-10 rounded-2xl overflow-hidden shadow-lg border border-stone-200 dark:border-stone-700"
                    >
                      <img 
                        src={imageUrl} 
                        alt="Generated illustration" 
                        className="w-full h-auto object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={generateImage}
                  disabled={isLoading || isImageLoading || !story}
                  className="w-full py-4 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-olive hover:text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 border border-stone-200 dark:border-stone-700 disabled:opacity-50"
                >
                  {isImageLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      이미지 생성 중...
                    </>
                  ) : (
                    <>
                      눈 앞에 그려진 이야기 (이미지 생성)
                    </>
                  )}
                </motion.button>

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={generateStory}
                  disabled={isLoading || isImageLoading}
                  className="w-full py-4 border-2 border-olive/20 text-olive hover:bg-olive hover:text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                  다시 들려주는 이야기
                </motion.button>
              </div>
            </div>
          ) : !isLoading && !error && (
            <motion.div 
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center p-16 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-[40px] mb-12 bg-white/30 dark:bg-stone-900/30"
            >
              <p className="text-stone-400 italic text-lg">
                당신의 상상이 문학이 되는 순간.<br/>
                배경과 주인공을 입력하고 이야기를 시작하세요.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Saved Stories Section */}
        {savedStories.length > 0 && (
          <div className="mt-20 space-y-10">
            <div className="flex items-center gap-6">
              <h2 className="text-3xl font-bold text-stone-900 dark:text-white">나의 서재</h2>
              <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {savedStories.map((s) => (
                <motion.div 
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="card-base rounded-3xl p-8 relative group cursor-default"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-bold text-lg text-stone-800 dark:text-stone-200 mb-1">{s.title}</h3>
                      <p className="text-xs text-stone-400 uppercase tracking-widest font-sans">{s.date}</p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => copyToClipboard(s.content)}
                        className="p-2 hover:text-olive transition-colors bg-stone-50 dark:bg-stone-800 rounded-full"
                        title="복사"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteStory(s.id)}
                        className="p-2 hover:text-red-500 transition-colors bg-stone-50 dark:bg-stone-800 rounded-full"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-stone-600 dark:text-stone-400 font-serif leading-relaxed line-clamp-4 whitespace-pre-wrap">
                    {s.content}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <footer className="mt-24 mb-12 text-center text-stone-400 text-sm">
          <p>© 2024 네가 들려주는 이야기 · Powered by Gemini AI</p>
        </footer>
      </motion.div>
    </div>
  );
}
