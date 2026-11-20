import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

export interface SupabaseSaveSlotMeta {
    slotNum: number;
    characterName: string;
    level: number;
    storagePath: string;
    updatedAt: string;
    timestampDisplay: string;
    metaJson?: Record<string, any>;
}

const formatKoreanDateTime = (isoString: string): string => {
    try {
        const d = new Date(isoString);
        return d.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    } catch {
        return isoString;
    }
};

export const getSupabaseSavesMetaList = async (
    userId: string
): Promise<Record<string, SupabaseSaveSlotMeta>> => {
    if (!isSupabaseConfigured() || !userId) return {};
    const supabase = getSupabaseClient();
    if (!supabase) return {};

    try {
        const { data, error } = await supabase
            .from('save_slots')
            .select('slot_num, character_name, level, storage_path, updated_at, meta_json')
            .eq('user_id', userId);

        if (error || !data) return {};

        const result: Record<string, SupabaseSaveSlotMeta> = {};
        data.forEach((row: any) => {
            const slotKey = String(row.slot_num);
            result[slotKey] = {
                slotNum: row.slot_num,
                characterName: row.character_name || '이름 없음',
                level: row.level || 1,
                storagePath: row.storage_path,
                updatedAt: row.updated_at,
                timestampDisplay: formatKoreanDateTime(row.updated_at),
                metaJson: row.meta_json || {}
            };
        });
        return result;
    } catch (err) {
        console.warn('[SupabaseSave] getSupabaseSavesMetaList failed:', err);
        return {};
    }
};

export const uploadLightSaveToSupabase = async (
    userId: string,
    slotNum: number,
    compressedPayload: string,
    meta: { characterName: string; level: number; metaJson?: Record<string, any> }
): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
        throw new Error('Supabase가 설정되지 않았습니다.');
    }

    const storagePath = `${userId}/slot_${slotNum}.lz`;
    const blob = new Blob([compressedPayload], { type: 'text/plain;charset=utf-8' });

    const { error: uploadErr } = await supabase.storage
        .from('save-bundles')
        .upload(storagePath, blob, {
            upsert: true,
            contentType: 'text/plain;charset=utf-8'
        });

    if (uploadErr) {
        throw new Error(`Supabase 세이브 업로드 실패: ${uploadErr.message}`);
    }

    const { error: dbErr } = await supabase
        .from('save_slots')
        .upsert(
            {
                user_id: userId,
                slot_num: slotNum,
                character_name: meta.characterName || '이름 없음',
                level: meta.level || 1,
                storage_path: storagePath,
                updated_at: new Date().toISOString(),
                meta_json: meta.metaJson || {}
            },
            { onConflict: 'user_id,slot_num' }
        );

    if (dbErr) {
        throw new Error(`Supabase 슬롯 메타 저장 실패: ${dbErr.message}`);
    }
};

export const downloadLightSaveFromSupabase = async (
    userId: string,
    slotNum: number
): Promise<string | null> => {
    const supabase = getSupabaseClient();
    if (!supabase || !userId) return null;

    const storagePath = `${userId}/slot_${slotNum}.lz`;
    const { data, error } = await supabase.storage
        .from('save-bundles')
        .download(storagePath);

    if (error || !data) return null;
    return await data.text();
};

export const deleteSaveFromSupabase = async (
    userId: string,
    slotNum: number
): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase || !userId) return;

    const storagePath = `${userId}/slot_${slotNum}.lz`;
    await supabase.storage.from('save-bundles').remove([storagePath]);
    await supabase
        .from('save_slots')
        .delete()
        .eq('user_id', userId)
        .eq('slot_num', slotNum);
};
