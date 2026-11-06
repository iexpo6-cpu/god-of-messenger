
import React, { useState, useEffect, useRef } from 'react';
import { Item, Character, ItemRarity, Stats } from '../types';
import { generateCraftingResults } from '../services/geminiService';
import { calculateItemPrice, getRandomMythicOption } from '../utils';
import { Gavel, RefreshCw, X, Coins, Clock, Sparkles, Package,Minus,Plus, DoorOpen } from 'lucide-react';
import { ItemTooltip } from './CharacterSheet';
import { WEAPON_TYPES, ARMOR_TYPES, SUB_WEAPON_TYPES, ACCESSORY_TYPES, RARITY_CONFIG, getCrystalKey } from './WorkshopModal';
import ActionResultModal, { ResultData } from './ActionResultModal';
import {SHINRYOKU_TYPES_LIST} from '../constants'

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

// [NEW] 경매장 아이템 타입별 이미지 매핑
const AUCTION_IMAGE_MAP: Record<string, string> = {
    // 무기류
    'Sword': "https://i.ibb.co/ZpTVjmQZ/Gemini-Generated-Image-7k1m5e7k1m5e7k1m.png",
    'Spear': "https://i.ibb.co/Fk7H5stm/Gemini-Generated-Image-ae86k4ae86k4ae86.png",
    'Blunt': "https://i.ibb.co/8DXCnWkm/Gemini-Generated-Image-5ec4um5ec4um5ec4.png",
    'Axe': "https://i.ibb.co/TBZMCtZ0/Gemini-Generated-Image-yj99byyj99byyj99.png",
    'Knuckle': "https://i.ibb.co/bjRTVKNG/Gemini-Generated-Image-woql0twoql0twoql.png",
    'Bow': "https://i.ibb.co/p6jX1xSH/Gemini-Generated-Image-o3ydovo3ydovo3yd.png",
    'Firearm': "https://i.ibb.co/WvMLx2BH/Gemini-Generated-Image-u8551xu8551xu855.png",
    'Heavy':"https://i.ibb.co/Z1kgVZMX/Gemini-Generated-Image-21pxpd21pxpd21px.png",
    'Staff': "https://i.ibb.co/tMWDsVrp/Gemini-Generated-Image-ttuqehttuqehttuq.png",
    'Energy' :"https://i.ibb.co/k6mypzz8/Gemini-Generated-Image-h58bsbh58bsbh58b.png",
    'Grimoire': "https://i.ibb.co/Gf9XzNFk/Gemini-Generated-Image-lt9on5lt9on5lt9o.png",
    'Crossbow': "https://i.ibb.co/p6jX1xSH/Gemini-Generated-Image-o3ydovo3ydovo3yd.png",
    'Thrown': "https://i.ibb.co/8gc7BCs8/Gemini-Generated-Image-t0mu6tt0mu6tt0mu.png",
    // 보조무기류
    'Shield': "https://i.ibb.co/FbJMLnB4/Gemini-Generated-Image-p82pz0p82pz0p82p.png",
    'Orb': "https://i.ibb.co/rKpkMss3/Gemini-Generated-Image-yiviuvyiviuvyivi.png",
    'SubSword': "https://i.ibb.co/mVrHxJ1F/Gemini-Generated-Image-7e1jk47e1jk47e1j.png",
    // 방어구 및 기타 부위 기본값
    'Head': "https://i.ibb.co/Hyj5zP8/Gemini-Generated-Image-sz8rhrsz8rhrsz8r.png",
    'Body': "https://i.ibb.co/RGqxb6kx/Gemini-Generated-Image-n56nd8n56nd8n56n.png",
    'Feet': "https://i.ibb.co/bjfM6bkj/Gemini-Generated-Image-th4yqzth4yqzth4y.png",
    'Hand': "https://i.ibb.co/sv9KMmM6/Gemini-Generated-Image-wwlb0uwwlb0uwwlb.png",
    'Accessory': "https://i.ibb.co/1GCj1Rx4/Gemini-Generated-Image-zexal1zexal1zexa.png"
};

const AuctionModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter }) => {
    const [auctionItem, setAuctionItem] = useState<Item | null>(null);
    const [currentBid, setCurrentBid] = useState(0);
    const [highestBidder, setHighestBidder] = useState<string>('System');
    const [auctionStatus, setAuctionStatus] = useState<'generating' | 'active' | 'won' | 'lost'>('generating');
    const [log, setLog] = useState<string[]>([]);
    const [customBidInput, setCustomBidInput] = useState<string>('');
    
    const [aiMaxBid, setAiMaxBid] = useState(0);
    const [aiName, setAiName] = useState("Unknown");

    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

    const MIN_INCREMENT = 10000;
    const LOG_LIMIT = 5;

   useEffect(() => {
        generateAuctionItem();
    }, []);

    const addLog = (msg: string) => {
        setLog(prev => [msg, ...prev].slice(0, LOG_LIMIT));
    };

    
    const getDetailedImageUrl = (type: string, name: string, weaponType?: string): string => {
        // 무기나 보조무기인 경우 weaponType이 있으면 해당 이미지를 우선 사용
        if ((type === 'Weapon' || type === 'SubWeapon') && weaponType) {
            if (AUCTION_IMAGE_MAP[weaponType]) return AUCTION_IMAGE_MAP[weaponType];
        }

        // 기본 타입별 폴백 (Head, Body, Feet, Hand, Accessory 등)
        return AUCTION_IMAGE_MAP[type] || "https://i.ibb.co/6RsrXBZW/image.png";
    };
const generateBaseStats = (category: string, subType: string, rarity: ItemRarity) => {
      const multiplier = RARITY_CONFIG[rarity].multiplier;
      const baseVal = Math.floor(2 * multiplier);
      const stats: Partial<Stats> = {};

      if (category === 'Weapon') {
          if (subType.includes('활') || subType.includes('단검') || subType.includes('총')) stats.agi = baseVal;
          else if (subType.includes('지팡이') || subType.includes('마법')) stats.int = baseVal;
          else stats.str = baseVal; 
      } else if (category === 'SubWeapon') {
          if (subType.includes('방패')) stats.def = baseVal;
          else if (subType.includes('보주')) { stats.int = Math.ceil(baseVal/2); stats.wis = Math.ceil(baseVal/2); }
          else stats.agi = baseVal;
      } else if (category === 'Body') {
        if (Math.random() < 0.25) stats.str = baseVal;
        else if (Math.random() < 0.25) stats.int = baseVal;
          else stats.def = baseVal;
            } else if (category === 'Feet') {
            if (Math.random() < 0.25) stats.def = baseVal;
        else if (Math.random() < 0.25) stats.wis = baseVal;
          else stats.agi = baseVal;}
          else if (category === 'Hand') {
            if (Math.random() < 0.25) stats.def = baseVal;
        else if (Math.random() < 0.25) stats.str = baseVal;
          else if (Math.random() < 0.25) stats.int = baseVal;
          else stats.def = baseVal;
            }else if (category === 'Head') {
             if (Math.random() < 0.25) stats.str = baseVal;
        else if (Math.random() < 0.25) stats.int = baseVal;
          else stats.def = baseVal;
      } else if (category === 'Accessory') {
          const roll = Math.random();
          if (roll < 0.25) stats.str = baseVal;
          else if (roll < 0.5) stats.int = baseVal;
          else if (roll < 0.75) stats.agi = baseVal;
          else stats.wis = baseVal;
      }
      return stats;
  };



    const generateAuctionItem = async () => {
        // Probability: 90% Epic/Unique, 10% Legendary
        
        const roll = Math.random();
        let rarity = ItemRarity.EPIC;
         if (roll < 0.01) rarity = ItemRarity.MYTHTIC;
        else if (roll < 0.1) rarity = ItemRarity.LEGENDARY;
        else if (roll < 0.45) rarity = ItemRarity.UNIQUE;
        else rarity = ItemRarity.EPIC;

        const types = ['Weapon', 'SubWeapon', 'Head', 'Body', 'Feet', 'Hand', 'Accessory'];
        const type = types[Math.floor(Math.random() * types.length)];
        const subType = type === "Weapon" ? "무기" : type === "SubWeapon" ? "보조무기" : type === "Head" ? "투구" : type === "Body" ? "갑옷" : type === "Feet" ? "신발" : type === "Hand" ? "장갑" : type === "Accessory" ? "장신구" : "장비"; // Generic for generation context

        try {
            const result = await generateCraftingResults(type, subType, rarity, 3); // 3 options default
            
            const basePrice = rarity === ItemRarity.MYTHTIC ? 1000000000 : rarity ===ItemRarity.LEGENDARY ? 20000000 : rarity === ItemRarity.UNIQUE ? 2000000 : rarity === ItemRarity.EPIC ? 1000000 : 500000;
            const startPrice = Math.floor(basePrice * 0.5);
 let elementalType: string | undefined = undefined;
          result.options.forEach(opt => {
              if (opt.includes('속성 부여')) {
                  const type = SHINRYOKU_TYPES_LIST.find(t => opt.includes(t.replace('계', '')));
                  if (type) elementalType = type;
                      if (!type) {
                      if (opt.includes('화염')) elementalType = '화염계';
                      else if (opt.includes('빙결')) elementalType = '빙결계';
                      else if (opt.includes('전격')) elementalType = '전격계';
                      else if (opt.includes('암흑')) elementalType = '암흑계';
                      else if (opt.includes('광휘')) elementalType = '광휘계';
                      else if (opt.includes('대지')) elementalType = '대지계';
                      else if (opt.includes('질풍')) elementalType = '질풍계';
                      else if (opt.includes('해수')) elementalType = '해수계';
                      else if (opt.includes('태양')) elementalType = '태양계';
                      else if (opt.includes('월광')) elementalType = '월광계';
                      else if (opt.includes('무기강화')) elementalType = '무기강화계';
                      else if (opt.includes('신체강화')) elementalType = '신체강화계';
                      else if (opt.includes('강철')) elementalType = '강철계';
                      else if (opt.includes('초화')) elementalType = '초화계';
                  }
              }
          });
   const baseStats = generateBaseStats(type as any, result.weaponType, rarity);
            const newItem: Item = {
                name: result.name,
                description: result.description,
                type: type as any,
                rarity: rarity,
                secondaryOptions: result.options,
                enhancement: 0,
                optionLevels: new Array(result.options.length).fill(1),
                stats: baseStats,
                elementalType: elementalType,
                price: basePrice,
                 weaponType: result.weaponType, // AI가 제공한 무기 타입 할당
                // [MODIFIED] weaponType을 인자로 전달하여 이미지 판별
                imageUrl: getDetailedImageUrl(type, result.name, result.weaponType),
                mythicOption: rarity === ItemRarity.MYTHTIC ? getRandomMythicOption() : undefined
            };

            setAuctionItem(newItem);
            setCurrentBid(startPrice);
            
            // Setup AI Opponent
            const npcNames = ["부유한 상인", "귀족 수집가", "왕실 근위대장", "익명의 대부호", "타국의 사절"];
            setAiName(npcNames[Math.floor(Math.random() * npcNames.length)]);
            
            // AI willing to pay 1.2x to 3.0x of base value depending on rarity
            const aiMultiplier = 1.2 + Math.random() * (rarity === ItemRarity.LEGENDARY ? 2.5 : 1.5);
            setAiMaxBid(Math.floor(basePrice * aiMultiplier));
            
            setAuctionStatus('active');
            addLog(`경매 시작! 시작가: ${startPrice.toLocaleString()} G`);

        } catch (e) {
            console.error(e);
            onClose();
        }
    };

    const handlePlayerBid = () => {
        if (auctionStatus !== 'active') return;
        
        const bidAmount = parseInt(customBidInput);
        if (isNaN(bidAmount) || bidAmount <= currentBid) {
            alert(`최소 입찰 금액은 ${(currentBid + 1).toLocaleString()}G 이상이어야 합니다.`);
            return;
        }

        if (character.money < bidAmount) {
            setResultData({
                type: 'warning',
                title: '입찰 불가',
                message: '입찰에 필요한 골드가 부족합니다.',
                items: [{ label: '필요 골드', after: `${bidAmount.toLocaleString()} G` }]
            });
            return;
        }

        setCurrentBid(bidAmount);
        setHighestBidder('Player');
        addLog(`플레이어 입찰: ${bidAmount.toLocaleString()} G`);

        setTimeout(() => {
            if (bidAmount < aiMaxBid) {
                const aiBid = bidAmount + MIN_INCREMENT;
                setCurrentBid(aiBid);
                setHighestBidder('NPC');
                addLog(`${aiName} 입찰: ${aiBid.toLocaleString()} G`);
            } else {
                setAuctionStatus('won');
                addLog(`${aiName}가 입찰을 포기했습니다! 낙찰!`);
            }
        }, 1500);
    };

    const handleClaim = () => {
        if (auctionStatus !== 'won' || !auctionItem) return;
        const newChar = { ...character };
        newChar.money -= currentBid;
        newChar.inventory.push(auctionItem);
        newChar.lastAuctionDate = character.currentDate?.substring(0, 7);
        onUpdateCharacter(newChar, `[경매장] ${auctionItem.name} 낙찰! (-${currentBid.toLocaleString()} G)`);
        onClose();
    };

    const applyCooldownAndClose = (logMsg: string) => {
        const newChar = { ...character };
        newChar.lastAuctionDate = character.currentDate?.substring(0, 7); 
        onUpdateCharacter(newChar, logMsg);
        onClose();
    };

    const handleForfeit = () => {
        setConfirmAction(() => () => applyCooldownAndClose("[경매장] 경매를 포기했습니다."));
        setResultData({
            type: 'warning',
            title: '경매 포기',
            message: '정말 경매를 포기하시겠습니까?\n이번 달은 더 이상 경매장을 이용할 수 없습니다.',
            items: []
        });
    };

    const handleCloseWrapper = () => {
        if (auctionStatus === 'won') {
             setConfirmAction(() => () => applyCooldownAndClose("[경매장] 낙찰된 아이템을 포기하고 나옵니다."));
             setResultData({
                 type: 'warning',
                 title: '아이템 포기',
                 message: '낙찰된 아이템을 수령하지 않고 나가시겠습니까?\n아이템은 사라지고 골드는 차감되지 않지만, 이번 달 경매 기회는 소진됩니다.',
                 items: []
             });
        } else {
             applyCooldownAndClose("[경매장] 경매장을 떠납니다.");
        }
    };

    const handleModalClose = () => {
        setResultData(null);
        setConfirmAction(null);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in zoom-in-95">
            {resultData && (
                <ActionResultModal 
                    data={resultData} 
                    onClose={handleModalClose} 
                    onContinue={confirmAction ? () => { confirmAction(); handleModalClose(); } : undefined} 
                />
            )}

            <div className="bg-slate-900 border border-purple-500 w-full max-w-lg rounded-xl shadow-[0_0_50px_rgba(168,85,247,0.3)] relative overflow-hidden flex flex-col">
                <div className="p-4 border-b border-purple-900/50 bg-purple-950/20 flex justify-between items-center shrink-0">
                    <div className="flex items-center text-purple-400 font-bold text-lg">
                        <Gavel className="mr-2"/> 경매장
                    </div>
                    <button onClick={handleCloseWrapper} className="text-slate-500 hover:text-white"><X size={24}/></button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {auctionStatus === 'generating' ? (
                        <div className="flex flex-col items-center justify-center h-48 space-y-4">
                            <RefreshCw className="animate-spin text-purple-500" size={48}/>
                            <p className="text-slate-400 text-sm">경매 물품을 준비하고 있습니다...</p>
                        </div>
                    ) : auctionItem && (
                        <div className="space-y-6">
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center gap-4 relative group">
                                <div className={`w-16 h-16 rounded-lg border bg-slate-900 overflow-hidden flex items-center justify-center shrink-0 ${auctionItem.rarity === ItemRarity.LEGENDARY ? 'border-amber-500 shadow-amber-500/20' : 'border-purple-500'}`}>
                                    <img src={auctionItem.imageUrl} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-bold text-lg truncate ${auctionItem.rarity === ItemRarity.LEGENDARY ? 'text-amber-400' : 'text-purple-300'}`}>{auctionItem.name}</h3>
                                    <p className="text-xs text-slate-500">{auctionItem.rarity} | {auctionItem.type}</p>
                                </div>
                                <div className="absolute top-full left-0 z-50 mt-1 hidden group-hover:block w-full">
                                    <div className="bg-black p-2 rounded border border-slate-700 shadow-xl">
                                        <ItemTooltip item={auctionItem} character={character} />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 text-center relative overflow-hidden">
                                {auctionStatus === 'won' && <div className="absolute inset-0 bg-green-900/80 flex items-center justify-center text-2xl font-bold text-white z-10 animate-in fade-in">낙찰 성공!</div>}
                                <p className="text-xs text-slate-400 uppercase mb-2">Current Bid</p>
                                <div className="text-3xl font-mono font-bold text-white mb-2 flex items-center justify-center">
                                    {currentBid.toLocaleString()} <Coins size={24} className="ml-2 text-amber-400"/>
                                </div>
                                <div className="text-xs text-slate-500 flex justify-center items-center gap-2">
                                    <span>Highest Bidder:</span>
                                    <span className={`font-bold ${highestBidder === 'Player' ? 'text-green-400' : 'text-red-400'}`}>
                                        {highestBidder === 'Player' ? character.name : aiName}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-black/40 p-3 rounded border border-slate-800 h-24 overflow-hidden flex flex-col justify-end">
                                {log.map((l, i) => (
                                    <div key={i} className={`text-[10px] mb-0.5 ${l.includes('낙찰') ? 'text-green-400 font-bold' : l.includes('플레이어') ? 'text-blue-300' : 'text-red-300'}`}>
                                        {l}
                                    </div>
                                ))}
                            </div>

                            {auctionStatus === 'active' && (
                                <div className="bg-slate-950 p-4 rounded-xl border border-purple-500/30 space-y-3">
                                    <label className="text-[10px] text-slate-500 uppercase font-bold block">Your Bid Amount</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input 
                                                type="number"
                                                value={customBidInput}
                                                onChange={(e) => setCustomBidInput(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white font-mono focus:border-amber-500 outline-none text-right pr-10"
                                                min={currentBid + 1}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">G</span>
                                        </div>
                                        <div className="flex flex-col gap-1 shrink-0">
                                            <button 
                                                onClick={() => setCustomBidInput((parseInt(customBidInput || '0') + 10000).toString())}
                                                className="bg-slate-800 hover:bg-slate-700 p-1 rounded text-slate-400 border border-slate-700"
                                            >
                                                <Plus size={14}/>
                                            </button>
                                            <button 
                                                onClick={() => setCustomBidInput(Math.max(currentBid + 1, parseInt(customBidInput || '0') - 10000).toString())}
                                                className="bg-slate-800 hover:bg-slate-700 p-1 rounded text-slate-400 border border-slate-700"
                                            >
                                                <Minus size={14}/>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-slate-600">
                                        <span>내 자산: {(character.money || 0).toLocaleString()} G</span>
                                        <span>최소 입찰: {(currentBid + 1).toLocaleString()} G</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3">
                                {auctionStatus === 'active' ? (
                                    <>
                                        <button 
                                            onClick={handleForfeit}
                                            className="flex-1 py-4 bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500 rounded-lg font-bold transition-all flex items-center justify-center"
                                        >
                                            <DoorOpen size={20} className="mr-2"/> 포기
                                        </button>
                                        <button 
                                            onClick={handlePlayerBid}
                                            disabled={highestBidder === 'Player'}
                                            className="flex-[2] py-4 bg-amber-700 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                                        >
                                            <Gavel size={20} className="mr-2"/> 
                                            {highestBidder === 'Player' ? '응찰 대기 중...' : '입찰 하기'}
                                        </button>
                                    </>
                                ) : auctionStatus === 'won' ? (
                                    <button 
                                        onClick={handleClaim}
                                        className="w-full py-4 bg-green-700 hover:bg-green-600 text-white font-bold rounded-lg shadow-lg flex items-center justify-center transition-all animate-pulse"
                                    >
                                        <Package size={20} className="mr-2"/> 아이템 수령하기
                                    </button>
                                ) : (
                                    <button onClick={handleCloseWrapper} className="w-full py-4 bg-slate-700 text-slate-300 rounded-lg">종료</button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuctionModal;
