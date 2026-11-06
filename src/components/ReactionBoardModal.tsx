import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, MessageSquare, ThumbsUp, LayoutGrid, MapPin, RefreshCw, 
  Loader2, Mic2, Newspaper, Radio, ChevronRight, Info, 
  Bookmark, BookmarkCheck, Flame, Skull, UserPlus, Star, 
  Send, UserCheck, Landmark, ShieldAlert, Award, Medal 
} from 'lucide-react';
import { Character, WorldReaction, NewsArticle, InterviewData } from '../types';
import { generateWorldReactions, generateCommentReply, generateNewsArticles } from '../services/geminiService';
import InterviewModal from './InterviewModal';

interface Props {
  character: Character;
  onClose: () => void;
  onUpdateCharacter?: (newChar: Character, logMsg: string) => void;
  onAcceptInterview?: (skeleton: InterviewData) => Promise<void>;
}

type TabType = 'all' | 'news' | 'player' | 'celebs' | 'boss' | 'politics' | 'society' | 'saved';

const CATEGORY_MAP: Record<TabType, string> = {
  all: '전체 피드',
  news: '공식 언론',
  player: '나의 소문',
  celebs: '유명인 소식',
  boss: '보스/마물',
  politics: '정세/외교',
  society: '군사/용병',
  saved: '보관함'
};

const ReactionBoardModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter, onAcceptInterview }) => {
  const [reactions, setReactions] = useState<WorldReaction[]>([]);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<WorldReaction | NewsArticle | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [isTypingReply, setIsTypingReply] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const detailEndRef = useRef<HTMLDivElement>(null);

  // 인터뷰 관련 UI 상태
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [activeInterview, setActiveInterview] = useState<InterviewData | null>(null);
  const [showInterviewList, setShowInterviewList] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  // 1일 1회 갱신 체크 로직
  const canRefresh = character.lastReactionRefreshDate !== character.currentDate;

  // 질문 생성 완료 이벤트 수신
  useEffect(() => {
    const handleReady = (e: any) => {
      const fullData = e.detail;
      setActiveInterview(fullData);
      setIsGeneratingQuestions(false);
      setIsInterviewModalOpen(true);
    };
    window.addEventListener('interview-ready', handleReady);
    return () => window.removeEventListener('interview-ready', handleReady);
  }, []);

  const fetchContent = async () => {
    if (!canRefresh && activeTab !== 'saved') {
      alert(`이미 오늘자 소식을 모두 확인했습니다.\n다음 갱신은 ${character.currentDate} 이후에 가능합니다.`);
      return;
    }

    setIsLoading(true);
    try {
      const [reactionData, newsData] = await Promise.all([
        generateWorldReactions(character),
        generateNewsArticles(character)
      ]);
      setReactions(reactionData);
      setArticles(newsData);
      
      // 갱신일 업데이트
      if (onUpdateCharacter) {
        const newChar = { ...character, lastReactionRefreshDate: character.currentDate };
        onUpdateCharacter(newChar, "[시스템] 세상의 소리 게시판과 언론망을 갱신했습니다.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSavePost = (e: React.MouseEvent, post: WorldReaction | NewsArticle) => {
    e.stopPropagation(); 
    if (!onUpdateCharacter) return;
    
    const newChar = { ...character };
    const saved = [...(newChar.savedReactions || [])];
    const isAlreadySaved = saved.some(s => s.id === post.id);

    if (isAlreadySaved) {
      newChar.savedReactions = saved.filter(s => s.id !== post.id);
    } else {
      newChar.savedReactions = [...saved, post];
    }

    onUpdateCharacter(newChar, "");
  };

  const isPostSaved = (postId: string) => {
    return character.savedReactions?.some(s => s.id === postId);
  };

  const handleDeclineInterview = (id: string) => {
    if (!onUpdateCharacter) return;
    const newChar = { ...character };
    newChar.pendingInterviews = (newChar.pendingInterviews || []).filter(i => i.id !== id);
    onUpdateCharacter(newChar, "[시스템] 인터뷰 요청을 거절했습니다.");
  };

  const handleStartInterviewRequest = async (skeleton: InterviewData) => {
    if (skeleton.questions && skeleton.questions.length > 0) {
      setActiveInterview(skeleton);
      setIsInterviewModalOpen(true);
      setShowInterviewList(false);
      return;
    }

    setIsGeneratingQuestions(true);
    setShowInterviewList(false);
    
    if (onAcceptInterview) {
      await onAcceptInterview(skeleton);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !selectedPost || isTypingReply) return;

    const userCommentText = commentInput.trim();
    const userComment = {
      author: character.name,
      text: userCommentText,
      time: "방금 전"
    };

    const updatedPostWithUser = { ...selectedPost, comments: [...selectedPost.comments, userComment] };
    setSelectedPost(updatedPostWithUser);
    
    if ('source' in selectedPost) {
      setArticles(prev => prev.map(a => a.id === selectedPost.id ? (updatedPostWithUser as NewsArticle) : a));
    } else {
      setReactions(prev => prev.map(p => p.id === selectedPost.id ? (updatedPostWithUser as WorldReaction) : p));
    }
    
    setCommentInput('');
    setIsTypingReply(true);
    
    try {
      const reply = await generateCommentReply(selectedPost, userCommentText, character);
      
      setTimeout(() => {
        const finalPost = { ...updatedPostWithUser, comments: [...updatedPostWithUser.comments, reply] };
        setSelectedPost(finalPost);
        if ('source' in finalPost) {
          setArticles(prev => prev.map(a => a.id === selectedPost.id ? (finalPost as NewsArticle) : a));
        } else {
          setReactions(prev => prev.map(p => p.id === selectedPost.id ? (finalPost as WorldReaction) : p));
        }
        setIsTypingReply(false);
        setTimeout(() => detailEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }, 1200);
    } catch (err) {
      setIsTypingReply(false);
    }
  };

  const displayedContent = useMemo(() => {
    if (activeTab === 'saved') return character.savedReactions || [];
    if (activeTab === 'news') return articles;
    
    return reactions.filter(r => {
      if (activeTab === 'all') return true;
      if (activeTab === 'player') return (r.category === 'Trending' && r.content.includes(character.name)) || r.category === 'Companion';
      if (activeTab === 'celebs') {
        const keywords = ['전설', '명공', '대장', '사령관', '단장', '마스터', '영웅', '왕'];
        return keywords.some(k => r.authorTitle.includes(k) || r.title.includes(k));
      }
      if (activeTab === 'boss') return r.category === 'News' && (r.title.includes('보스') || r.content.includes('마물'));
      if (activeTab === 'politics') return r.category === 'News' && (r.title.includes('국가') || r.title.includes('전쟁'));
      if (activeTab === 'society') return r.category === 'Rumor' || r.authorTitle.includes('용병');
      return true;
    });
  }, [activeTab, reactions, articles, character.savedReactions, character.name]);

  const getTabIcon = (tab: TabType) => {
    switch (tab) {
      case 'all': return <LayoutGrid size={14} />;
      case 'news': return <Newspaper size={14} />;
      case 'player': return <UserCheck size={14} />;
      case 'celebs': return <Star size={14} />;
      case 'boss': return <Skull size={14} />;
      case 'politics': return <Landmark size={14} />;
      case 'society': return <ShieldAlert size={14} />;
      case 'saved': return <BookmarkCheck size={14} />;
    }
  };

  const getCategoryBadge = (post: WorldReaction | NewsArticle) => {
    const isArticle = 'source' in post;
    if (isArticle) {
      return { 
        label: (post as NewsArticle).source || '공식 언론', 
        icon: <Newspaper size={11} />, 
        style: 'bg-blue-950/80 text-blue-300 border-blue-800/60' 
      };
    }
    switch (post.category) {
      case 'Trending':
        return { 
          label: '인기 소식', 
          icon: <Flame size={11} className="text-red-400" />, 
          style: 'bg-red-950/80 text-red-300 border-red-800/60' 
        };
      case 'Companion':
        return { 
          label: '동료 구인', 
          icon: <UserPlus size={11} className="text-emerald-400" />, 
          style: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60' 
        };
      case 'News':
        return { 
          label: '주요 뉴스', 
          icon: <Newspaper size={11} className="text-sky-400" />, 
          style: 'bg-sky-950/80 text-sky-300 border-sky-800/60' 
        };
      case 'Rumor':
        return { 
          label: '뒷골목 소문', 
          icon: <Skull size={11} className="text-purple-400" />, 
          style: 'bg-purple-950/80 text-purple-300 border-purple-800/60' 
        };
      default:
        return { 
          label: '일반 게시물', 
          icon: <MessageSquare size={11} />, 
          style: 'bg-slate-800 text-slate-300 border-slate-700' 
        };
    }
  };

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 animate-in fade-in">
      
      {/* 인터뷰 모달 */}
      {isInterviewModalOpen && activeInterview && (
        <InterviewModal 
          character={character} 
          data={activeInterview} 
          onClose={() => setIsInterviewModalOpen(false)}
          onUpdateCharacter={onUpdateCharacter!}
        />
      )}

      {/* 인터뷰 질문지 생성 로딩 오버레이 */}
      {isGeneratingQuestions && (
        <div className="fixed inset-0 z-[210] flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-amber-500 blur-3xl opacity-25"></div>
            <Loader2 size={56} className="animate-spin text-amber-400 relative z-10" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold text-white tracking-wide">인터뷰 질문지 작성 중</h3>
            <p className="text-xs text-amber-300 font-medium">"담당 기자가 녹음기를 점검하고 질문을 정리하고 있습니다..."</p>
            <p className="text-[11px] text-slate-500">차원 언론 네트워크 연결 중</p>
          </div>
        </div>
      )}

      {/* 인터뷰 요청 목록 오버레이 */}
      {showInterviewList && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 animate-in fade-in zoom-in-95">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-lg h-[65vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-amber-500/20 bg-amber-950/30 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-600/30 border border-amber-500/40 rounded-2xl text-amber-300">
                  <Mic2 size={22}/>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">인터뷰 요청 목록</h3>
                  <p className="text-[11px] text-amber-400/80">언론사 및 기자들의 공식 인터뷰 요청</p>
                </div>
              </div>
              <button 
                onClick={() => setShowInterviewList(false)} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={20}/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
              {character.pendingInterviews && character.pendingInterviews.length > 0 ? (
                character.pendingInterviews.map((int) => (
                  <div key={int.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-amber-500/50 transition-all flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white text-sm">{int.topic}</h4>
                        <p className="text-xs text-amber-400 font-semibold mt-0.5">{int.interviewer} • {int.interviewerTitle}</p>
                      </div>
                      <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-md font-bold animate-pulse">신규</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleDeclineInterview(int.id)}
                        className="flex-1 py-2 bg-slate-900 hover:bg-red-950/50 text-slate-400 hover:text-red-400 rounded-xl text-xs font-bold transition-all border border-slate-800"
                      >
                        거절
                      </button>
                      <button 
                        onClick={() => handleStartInterviewRequest(int)}
                        className="flex-[2] py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1"
                      >
                        수락 및 인터뷰 진행 <ChevronRight size={14}/>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
                  <Mic2 size={40} className="text-slate-700"/>
                  <p className="text-xs">현재 대기 중인 인터뷰 요청이 없습니다.</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2 items-center">
              <Info size={15} className="text-amber-400 shrink-0"/>
              <p className="text-[11px] text-slate-400 leading-snug">
                인터뷰 수락 시 당신의 위엄도에 비례한 거액의 출연료를 획득합니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 메인 모달 컨테이너 */}
      <div className="bg-slate-900 border border-slate-800 w-full max-w-6xl h-[88vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* 모달 헤더 */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
              <Radio size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">세상의 소리 & 여론 정보망</h2>
              <p className="text-xs text-indigo-400 font-medium">차원 너머의 소문과 진실</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => setShowInterviewList(true)}
              className="relative px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-2 transition-all"
            >
              <Mic2 size={15}/>
              <span>인터뷰 요청</span>
              {character.pendingInterviews && character.pendingInterviews.length > 0 && (
                <span className="w-5 h-5 bg-red-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold animate-bounce">
                  {character.pendingInterviews.length}
                </span>
              )}
            </button>

            <button 
              onClick={fetchContent}
              disabled={isLoading || (!canRefresh && activeTab !== 'saved')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 border text-xs font-bold ${
                isLoading || (!canRefresh && activeTab !== 'saved') 
                  ? 'bg-slate-800/50 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed' 
                  : 'bg-indigo-600/20 hover:bg-indigo-600/30 border-indigo-500/40 text-indigo-300'
              }`}
            >
              {isLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              <span className="hidden sm:inline">소식 갱신</span>
            </button>

            <button 
              onClick={onClose} 
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex bg-slate-950/60 border-b border-slate-800 px-4 overflow-x-auto no-scrollbar shrink-0 gap-1">
          {(Object.entries(CATEGORY_MAP) as [TabType, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setSelectedPost(null); }}
              className={`px-4 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${
                activeTab === id 
                  ? 'text-indigo-400 border-indigo-500 bg-indigo-950/20' 
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              {getTabIcon(id)}
              {label}
            </button>
          ))}
        </div>

        {/* 메인 콘텐츠 바디 */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* 좌측 게시글 목록 */}
          <div className={`flex-1 overflow-y-auto custom-scrollbar p-5 space-y-3 bg-slate-900/30 ${selectedPost ? 'hidden md:block' : 'block'}`}>
            
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center space-y-3">
                <Loader2 size={40} className="animate-spin text-indigo-400" />
                <p className="text-slate-400 text-xs font-medium animate-pulse">차원 정보망 동기화 중...</p>
              </div>
            ) : displayedContent.length > 0 ? (
              displayedContent.map((post) => {
                const isSaved = isPostSaved(post.id);
                const badge = getCategoryBadge(post);
                const isArticle = 'source' in post;
                const isRecruitPost = post.category === 'Companion';

                return (
                  <div
                    key={post.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedPost(post)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedPost(post);
                      }
                    }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-2.5 relative overflow-hidden group cursor-pointer ${
                      selectedPost?.id === post.id 
                        ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md' 
                        : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                    } ${isRecruitPost ? 'border-emerald-500/20' : ''}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${badge.style}`}>
                          {badge.icon}
                          {badge.label}
                        </span>
                        <span className="text-[11px] text-slate-500">{post.timestamp}</span>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <button 
                          onClick={(e) => toggleSavePost(e, post)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            isSaved 
                              ? 'bg-amber-950/60 border-amber-500/60 text-amber-400' 
                              : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-amber-400'
                          }`}
                          title={isSaved ? "보관 취소" : "보관하기"}
                        >
                          <Bookmark size={13} className={isSaved ? "fill-current" : ""} />
                        </button>
                        <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                          <span className="flex items-center gap-1"><ThumbsUp size={11}/> {post.likes}</span>
                          <span className="flex items-center gap-1"><MessageSquare size={11}/> {post.comments.length}</span>
                        </div>
                      </div>
                    </div>
                    
                    <h4 className={`text-base font-bold truncate transition-colors ${
                      selectedPost?.id === post.id ? 'text-indigo-200' : 'text-slate-200 group-hover:text-white'
                    }`}>
                      {post.title}
                    </h4>
                    
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] shrink-0">👤</div>
                      <span className="font-semibold text-slate-300">{post.author}</span>
                      <span className="text-[11px] text-slate-500">({post.authorTitle})</span>
                      {(isArticle || post.location) && (
                        <span className="text-[11px] text-indigo-400 ml-auto flex items-center gap-1 shrink-0">
                          <MapPin size={11}/> 
                          {(post as NewsArticle).location || post.location}
                        </span>
                      )}
                    </div>

                    {isRecruitPost && (
                      <div className="absolute -right-3 -bottom-3 opacity-5 pointer-events-none">
                        <UserPlus size={90} className="text-emerald-500" />
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 py-12">
                <MessageSquare size={40} className="text-slate-700" />
                <p className="text-xs">표시할 소식이 없습니다.</p>
              </div>
            )}
          </div>

          {/* 우측 게시글 상세 보기 */}
          <div className={`w-full md:w-[480px] border-l border-slate-800 bg-slate-950/50 flex flex-col ${
            selectedPost ? 'flex animate-in slide-in-from-right-4' : 'hidden md:flex'
          }`}>
            {selectedPost ? (
              <div className="flex flex-1 flex-col overflow-hidden">
                
                {/* 게시글 상단 Header */}
                <div className="p-5 border-b border-slate-800 bg-slate-900/60">
                  <div className="flex justify-between items-center mb-3">
                    <button 
                      onClick={() => setSelectedPost(null)} 
                      className="md:hidden text-slate-400 hover:text-white flex items-center gap-1 text-xs font-bold"
                    >
                      <X size={18}/> 목록으로
                    </button>
                    <div className="flex items-center gap-2 ml-auto">
                      <button 
                        onClick={(e) => toggleSavePost(e, selectedPost)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          isPostSaved(selectedPost.id) 
                            ? 'bg-amber-950/60 border-amber-500/60 text-amber-400' 
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Bookmark size={16} className={isPostSaved(selectedPost.id) ? 'fill-current' : ''} />
                      </button>
                      <span className="text-[11px] text-slate-500 font-mono">{selectedPost.timestamp}</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-3 leading-snug">{selectedPost.title}</h3>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm shadow-inner shrink-0">👤</div>
                    <div>
                      <div className="text-xs font-bold text-white">{selectedPost.author}</div>
                      <div className="text-[11px] text-slate-400">{selectedPost.authorTitle}</div>
                    </div>
                  </div>
                </div>

                {/* 게시글 본문 및 댓글 목록 */}
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-5">
                  {selectedPost.category === 'Companion' && selectedPost.location && (
                    <div className="bg-emerald-950/30 border border-emerald-500/40 p-3.5 rounded-2xl flex items-center gap-3">
                      <MapPin className="text-emerald-400 shrink-0" size={20}/>
                      <div>
                        <p className="text-xs font-bold text-emerald-200">만남 가능 장소 포착</p>
                        <p className="text-[11px] text-emerald-300/80 mt-0.5 leading-relaxed">
                          {selectedPost.location} 뒷골목에서 이 인물을 만날 수 있습니다.<br/>
                          게시글을 **보관**한 뒤 해당 도시의 뒷골목을 방문해보세요.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="text-xs leading-relaxed whitespace-pre-wrap p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-200">
                    {selectedPost.content}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-slate-400">댓글 목록 ({selectedPost.comments.length}개)</h5>
                    </div>

                    <div className="space-y-2.5">
                      {selectedPost.comments.map((comment, i) => (
                        <div key={i} className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-indigo-300">{comment.author}</span>
                            <span className="text-[10px] text-slate-500">{comment.time}</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-normal">{comment.text}</p>
                        </div>
                      ))}

                      {isTypingReply && (
                        <div className="flex items-center gap-2 text-indigo-400 px-2 py-1 animate-pulse">
                          <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                          <div className="w-1.5 h-1.5 bg-current rounded-full delay-75"></div>
                          <div className="w-1.5 h-1.5 bg-current rounded-full delay-150"></div>
                          <span className="text-xs font-medium">누군가 답글을 작성하고 있습니다...</span>
                        </div>
                      )}
                      <div ref={detailEndRef} />
                    </div>
                  </div>
                </div>

                {/* 댓글 작성 Input */}
                <div className="p-3.5 bg-slate-950 border-t border-slate-800 shrink-0">
                  <form onSubmit={handleAddComment} className="relative flex items-center gap-2">
                    <input 
                      type="text" 
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder="댓글을 입력하세요..."
                      disabled={isTypingReply}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl py-2 px-4 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all shadow-inner disabled:opacity-50"
                    />
                    <button 
                      type="submit"
                      disabled={!commentInput.trim() || isTypingReply}
                      className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-30 disabled:grayscale transition-all shadow-md active:scale-95 shrink-0"
                    >
                      <Send size={15} />
                    </button>
                  </form>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-8 text-center space-y-2">
                <Radio size={48} className="text-slate-700" />
                <h4 className="text-sm font-bold text-slate-400">소식 상세 보기</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  좌측 목록에서 게시글을 선택하여<br/>세상의 반응과 세부 내용을 확인하세요.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* 푸터 플레이어 정보 바 */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-wrap justify-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
            <Star size={12} className="text-amber-400" />
            <span>레벨 {character.level} {character.job}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
            <Award size={12} className="text-indigo-400" />
            <span>명성치: {character.mercenaryData?.reputation?.toLocaleString() || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
            <Medal size={12} className="text-cyan-400" />
            <span>공훈치: {character.militaryData?.merit?.toLocaleString() || 0}</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ReactionBoardModal;
