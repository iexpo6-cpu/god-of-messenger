/**
 * 통합 구글 드라이브 서비스 (세이브/로드 백업 및 차원 교신/결투 데이터 공유)
 */
import { 
  signInWithGoogleDrive, 
  signInWithGoogleDriveRedirect,
  getDriveAccessToken, 
  getValidDriveAccessToken,
  validateDriveAccessToken,
  invalidateDriveAccessToken,
  logoutDrive, 
  initDriveAuth,
  isMobileOrPWAEnvironment,
  checkRedirectAuthResult,
  getCurrentDriveUser,
  refreshDriveAccessTokenSilently
} from './googleDriveAuthService';

// 기존 AuthModal, SaveLoadModal, StartScreen 호환을 위한 Auth 래핑 함수들 내보내기
export const googleSignIn = signInWithGoogleDrive;
export const googleSignInRedirect = signInWithGoogleDriveRedirect;
export const getCachedAccessToken = getDriveAccessToken;
export const logoutGoogle = logoutDrive;
export const subscribeAuth = initDriveAuth;
export { 
  isMobileOrPWAEnvironment, 
  checkRedirectAuthResult, 
  getCurrentDriveUser,
  getValidDriveAccessToken,
  validateDriveAccessToken,
  invalidateDriveAccessToken,
  refreshDriveAccessTokenSilently
};

// 공유 링크에서 구글 드라이브 파일 ID를 추출하는 헬퍼 함수
export const extractFileIdFromUrl = (urlOrId: string): string => {
  const trimmed = urlOrId.trim();
  if (!trimmed) return '';
  
  // URL 형식인 경우 정규식 매칭
  const regDriveFile = /\/file\/d\/([a-zA-Z0-9-_]+)/;
  const regDriveOpen = /[?&]id=([a-zA-Z0-9-_]+)/;
  
  const matchFile = trimmed.match(regDriveFile);
  if (matchFile && matchFile[1]) return matchFile[1];
  
  const matchOpen = trimmed.match(regDriveOpen);
  if (matchOpen && matchOpen[1]) return matchOpen[1];
  
  // URL 형식이 아닌 경우 그냥 입력값 자체를 파일 ID로 판단
  return trimmed;
};

/**
 * '신의 사자 RPG' 폴더가 있는지 검색하고, 없으면 생성하여 ID를 반환합니다.
 */
export const findOrCreateAppFolder = async (accessToken: string): Promise<string> => {
  const folderName = '신의 사자 RPG';
  const query = encodeURIComponent(`name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  
  // 1. 폴더 검색
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
  const searchRes = await fetch(searchUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`구글 드라이브 폴더 검색 실패: ${errText}`);
  }
  
  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id; // 기존 폴더 ID 반환
  }
  
  // 2. 폴더가 없는 경우 새로 생성
  const createUrl = 'https://www.googleapis.com/drive/v3/files';
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });
  
  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`구글 드라이브 폴더 생성 실패: ${errText}`);
  }
  
  const createData = await createRes.json();
  return createData.id;
};

/**
 * 텍스트 콘텐츠를 파일로 생성하여 지정한 폴더 내에 업로드합니다.
 */
export const uploadTextFileToFolder = async (
  accessToken: string,
  folderId: string,
  fileName: string,
  content: string
): Promise<string> => {
  const boundary = 'foo_bar_baz_boundary';
  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: 'text/plain'
  };
  
  const multipartBody = 
    `\r\n--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/plain; charset=UTF-8\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--`;
    
  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink';
  
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartBody
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`파일 업로드 실패: ${errText}`);
  }
  
  const data = await res.json();
  return data.id;
};

/**
 * 업로드된 파일을 링크를 가진 누구나 볼 수 있도록 공개 공유 설정합니다.
 */
export const shareFileWithAnyone = async (accessToken: string, fileId: string): Promise<void> => {
  const permissionUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`;
  const res = await fetch(permissionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone'
    })
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`파일 공유 설정 실패: ${errText}`);
  }
};

/**
 * 파일의 웹 공유 링크를 받아옵니다.
 */
export const getFileWebViewLink = async (accessToken: string, fileId: string): Promise<string> => {
  const fileUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink`;
  const res = await fetch(fileUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`파일 정보 조회 실패: ${errText}`);
  }
  
  const data = await res.json();
  return data.webViewLink || '';
};

/**
 * 공유 링크(URL) 또는 ID로부터 해당 파일의 텍스트 내용을 직접 원격 로드(다운로드)합니다.
 */
export const fetchFileContentFromUrl = async (accessToken: string, urlOrId: string): Promise<string> => {
  const fileId = extractFileIdFromUrl(urlOrId);
  if (!fileId) {
    throw new Error('올바른 공유 링크 또는 파일 ID가 아닙니다.');
  }
  
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(downloadUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`차원 데이터 로드 실패. 링크 소유자에게 공유 권한이 승인되었는지 확인해 주십시오.`);
  }
  
  return await res.text();
};


/* ==========================================
   구글 드라이브 세이브/로드 클라우드 백업 전용 API
   ========================================== */

/**
 * 구글 드라이브 내 백업 세이브 리스트 메타 정보를 조회합니다.
 */
export const getDriveSavesMetaList = async (accessToken: string): Promise<Record<number, { timestamp: string; rawIsoTime?: string }>> => {
  try {
    if (!accessToken || accessToken.trim() === '') {
      return {};
    }

    const folderId = await findOrCreateAppFolder(accessToken);
    const query = encodeURIComponent(`'${folderId}' in parents and name contains 'Shinryoku_Cloud_Save_Slot_' and trashed=false`);
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)`;
    
    const res = await fetch(listUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!res.ok) {
      if (res.status === 401) {
        console.warn('구글 드라이브 세션 만료됨. 빈 기록을 반환합니다.');
        return {};
      }
      throw new Error('드라이브 파일 목록 조회 실패');
    }
    
    const data = await res.json();
    const metaMap: Record<number, { timestamp: string; rawIsoTime?: string }> = {};
    
    if (data.files) {
      data.files.forEach((file: any) => {
        const slotMatch = file.name.match(/Shinryoku_Cloud_Save_Slot_(\d+)\.txt/);
        if (slotMatch) {
          const slotNum = parseInt(slotMatch[1], 10);
          
          const localDate = new Date(file.modifiedTime);
          const formatted = localDate.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          
          metaMap[slotNum] = { 
            timestamp: formatted,
            rawIsoTime: file.modifiedTime 
          };
        }
      });
    }
    
    return metaMap;
  } catch (error) {
    console.warn('구글 드라이브 목록 조회 과정에서 무해한 예외가 처리되었습니다:', error);
    return {};
  }
};

/**
 * 특정 슬롯 세이브 압축 데이터를 구글 드라이브 클라우드로 업로드(백업)합니다.
 */
export const uploadSaveToDrive = async (slotNum: number, compressedData: string, accessToken: string): Promise<void> => {
  try {
    const folderId = await findOrCreateAppFolder(accessToken);
    const fileName = `Shinryoku_Cloud_Save_Slot_${slotNum}.txt`;
    
    // 1. 기존 동일 파일이 있는지 탐색
    const query = encodeURIComponent(`'${folderId}' in parents and name='${fileName}' and trashed=false`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    let existingFileId = '';
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        existingFileId = searchData.files[0].id;
      }
    }
    
    if (existingFileId) {
      // 2. 이미 존재하는 경우 내용 업데이트 (PATCH)
      const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`;
      const updateRes = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'text/plain'
        },
        body: compressedData
      });
      
      if (!updateRes.ok) {
        throw new Error('드라이브 세이브 업데이트 실패');
      }
    } else {
      // 3. 존재하지 않는 경우 신규 파일 생성
      await uploadTextFileToFolder(accessToken, folderId, fileName, compressedData);
    }
  } catch (error) {
    console.error('uploadSaveToDrive error:', error);
    throw error;
  }
};

/**
 * 특정 슬롯 세이브 데이터를 구글 드라이브에서 가져옵니다 (복원).
 */
export const downloadSaveFromDrive = async (slotId: number, accessToken: string): Promise<{ compressedData: string; timestamp: string } | null> => {
  try {
    const folderId = await findOrCreateAppFolder(accessToken);
    const fileName = `Shinryoku_Cloud_Save_Slot_${slotId}.txt`;
    
    const query = encodeURIComponent(`'${folderId}' in parents and name='${fileName}' and trashed=false`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,modifiedTime)`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    if (!searchData.files || searchData.files.length === 0) return null;
    
    const fileId = searchData.files[0].id;
    const modifiedTime = searchData.files[0].modifiedTime || new Date().toISOString();
    const formattedTime = new Date(modifiedTime).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const downloadRes = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!downloadRes.ok) {
      throw new Error('세이브 데이터를 다운로드하지 못했습니다.');
    }
    
    const textContent = await downloadRes.text();
    return { compressedData: textContent, timestamp: formattedTime };
  } catch (error) {
    console.error('downloadSaveFromDrive error:', error);
    throw error;
  }
};

/**
 * 특정 슬롯의 백업 세이브 데이터를 구글 드라이브에서 삭제합니다.
 */
export const deleteSaveFromDrive = async (slotId: number, accessToken: string): Promise<void> => {
  try {
    const folderId = await findOrCreateAppFolder(accessToken);
    const fileName = `Shinryoku_Cloud_Save_Slot_${slotId}.txt`;
    
    const query = encodeURIComponent(`'${folderId}' in parents and name='${fileName}' and trashed=false`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!searchRes.ok) return;
    const searchData = await searchRes.json();
    if (!searchData.files || searchData.files.length === 0) return;
    
    const fileId = searchData.files[0].id;
    const deleteUrl = `https://www.googleapis.com/drive/v3/files/${fileId}`;
    const deleteRes = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!deleteRes.ok) {
      throw new Error('세이브 파일 삭제 실패');
    }
  } catch (error) {
    console.error('deleteSaveFromDrive error:', error);
    throw error;
  }
};

/**
 * 특정 파일명으로 구글 드라이브에 이펙트 데이터를 업로드합니다.
 * 기존 동일 파일이 존재할 경우 완전히 삭제 후 새로 저장하여 저장 용량을 최적화합니다.
 */
export const uploadVfxFileToDrive = async (fileName: string, content: string, accessToken: string): Promise<string> => {
  try {
    const folderId = await findOrCreateAppFolder(accessToken);
    
    // 1. 기존 동일 파일이 있는지 탐색하여 모두 삭제 (용량 과도 차지 방지)
    const query = encodeURIComponent(`'${folderId}' in parents and name='${fileName}' and trashed=false`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        for (const file of searchData.files) {
          try {
            await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            });
          } catch (delErr) {
            console.warn('기존 이펙트 파일 삭제 중 오류:', delErr);
          }
        }
      }
    }
    
    // 2. 신규 파일 생성 및 공개 읽기 공유 설정
    const fileId = await uploadTextFileToFolder(accessToken, folderId, fileName, content);
    await shareFileWithAnyone(accessToken, fileId);
    return fileId;
  } catch (error) {
    console.error('uploadVfxFileToDrive error:', error);
    throw error;
  }
};

/**
 * 특정 파일명의 구글 드라이브 메타 정보(수정 일시 등)를 조회합니다.
 */
export const getVfxFileMeta = async (fileName: string, accessToken: string): Promise<{ fileId: string; modifiedTime: string } | null> => {
  try {
    const folderId = await findOrCreateAppFolder(accessToken);
    const query = encodeURIComponent(`'${folderId}' in parents and name='${fileName}' and trashed=false`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,modifiedTime)`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    if (!searchData.files || searchData.files.length === 0) return null;
    
    const file = searchData.files[0];
    const localDate = new Date(file.modifiedTime);
    const formatted = localDate.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return { fileId: file.id, modifiedTime: formatted };
  } catch (error) {
    console.error('getVfxFileMeta error:', error);
    return null;
  }
};

/**
 * 특정 파일명에 매칭되는 이펙트 데이터를 구글 드라이브에서 직접 다운로드합니다.
 */
export const downloadVfxFileFromDrive = async (fileName: string, accessToken: string): Promise<string | null> => {
  try {
    const folderId = await findOrCreateAppFolder(accessToken);
    
    const query = encodeURIComponent(`'${folderId}' in parents and name='${fileName}' and trashed=false`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    if (!searchData.files || searchData.files.length === 0) return null;
    
    const fileId = searchData.files[0].id;
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const downloadRes = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!downloadRes.ok) {
      throw new Error('이펙트 데이터를 다운로드하지 못했습니다.');
    }
    
    return await downloadRes.text();
  } catch (error) {
    console.error('downloadVfxFileFromDrive error:', error);
    throw error;
  }
};

// ============================================================================
// [하이브리드 분할 저장용] Google Drive custom_images 폴더 관리 API
// ============================================================================

export const findOrCreateCustomImagesFolder = async (accessToken: string): Promise<string> => {
  const parentId = await findOrCreateAppFolder(accessToken);
  const folderName = 'custom_images';
  const query = encodeURIComponent(`'${parentId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);

  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!searchRes.ok) {
    throw new Error(`custom_images 폴더 검색 실패: ${await searchRes.text()}`);
  }
  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      parents: [parentId],
      mimeType: 'application/vnd.google-apps.folder'
    })
  });
  if (!createRes.ok) {
    throw new Error(`custom_images 폴더 생성 실패: ${await createRes.text()}`);
  }
  const created = await createRes.json();
  return created.id;
};

const deleteDriveFilesBatch = async (fileIds: string[], accessToken: string): Promise<number> => {
  if (!fileIds.length) return 0;
  let deleted = 0;
  const BATCH_SIZE = 5;
  for (let i = 0; i < fileIds.length; i += BATCH_SIZE) {
    const batch = fileIds.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (id) => {
        try {
          const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (res.ok || res.status === 404) {
            deleted++;
          }
        } catch (err) {
          console.warn(`[GoogleDrive] 중복 파일(${id}) 삭제 실패:`, err);
        }
      })
    );
  }
  return deleted;
};

export const listCustomImageFilesInDrive = async (accessToken: string): Promise<Record<string, string>> => {
  const folderId = await findOrCreateCustomImagesFolder(accessToken);
  const fileMap: Record<string, string> = {};
  const duplicateIds: string[] = [];
  let pageToken: string | undefined;

  do {
    const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&pageSize=1000&fields=nextPageToken,files(id,name)${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!res.ok) break;
    const data = await res.json();
    (data.files || []).forEach((f: any) => {
      if (f?.name && f?.id) {
        const hash = String(f.name).replace(/\.json$/i, '');
        if (fileMap[hash]) {
          // 동일 해시 파일이 이미 존재하면 중복 사본으로 수집
          duplicateIds.push(f.id);
        } else {
          fileMap[hash] = f.id;
        }
      }
    });
    pageToken = data.nextPageToken;
  } while (pageToken);

  // 동일 해시 중복 파일이 발견되면 백그라운드에서 자동 삭제
  if (duplicateIds.length > 0) {
    deleteDriveFilesBatch(duplicateIds, accessToken).catch(() => {});
  }

  return fileMap;
};

/**
 * custom_images 폴더 내 동일 해시(<hash>.json) 중복 사본을 일괄 검사하여 1개만 남기고 삭제합니다.
 */
export const deduplicateCustomImagesInDrive = async (
  accessToken: string
): Promise<{
  totalFiles: number;
  uniqueFiles: number;
  deletedDuplicates: number;
  freedBytes: number;
}> => {
  const folderId = await findOrCreateCustomImagesFolder(accessToken);
  const seenMap = new Map<string, string>();
  const duplicateIds: string[] = [];
  let totalFiles = 0;
  let freedBytes = 0;
  let pageToken: string | undefined;

  do {
    const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&pageSize=1000&fields=nextPageToken,files(id,name,size)${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!res.ok) {
      throw new Error(`드라이브 이미지 목록 조회 실패 (${res.status})`);
    }
    const data = await res.json();
    (data.files || []).forEach((f: any) => {
      if (!f?.name || !f?.id) return;
      totalFiles++;
      const hash = String(f.name).replace(/\.json$/i, '');
      if (seenMap.has(hash)) {
        duplicateIds.push(f.id);
        freedBytes += Number(f.size || 0);
      } else {
        seenMap.set(hash, f.id);
      }
    });
    pageToken = data.nextPageToken;
  } while (pageToken);

  const deletedDuplicates = await deleteDriveFilesBatch(duplicateIds, accessToken);

  // 로컬 업로드 캐시도 최신 고유 해시 목록과 동기화
  const localUploaded = getUploadedHashesCache();
  seenMap.forEach((_id, hash) => localUploaded.add(hash));
  saveUploadedHashesCache(localUploaded);

  return {
    totalFiles,
    uniqueFiles: seenMap.size,
    deletedDuplicates,
    freedBytes
  };
};

// 동일 해시 동시 중복 업로드 방지 락
const inFlightImageHashes = new Set<string>();

const UPLOADED_HASHES_CACHE_KEY = 'shinryoku_gdrive_uploaded_hashes';

const getUploadedHashesCache = (): Set<string> => {
  try {
    const raw = localStorage.getItem(UPLOADED_HASHES_CACHE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

const saveUploadedHashesCache = (hashes: Set<string>) => {
  try {
    localStorage.setItem(UPLOADED_HASHES_CACHE_KEY, JSON.stringify(Array.from(hashes)));
  } catch {}
};

/**
 * 로컬 업로드 캐시 기준으로 아직 Google Drive에 올라가지 않은(변동/신규) 이미지만 즉시 필터링
 */
export const filterUnuploadedImages = <T extends { hash: string }>(images: T[]): T[] => {
  if (!images.length) return [];
  const localUploaded = getUploadedHashesCache();
  return images.filter(img => !localUploaded.has(img.hash));
};

export const uploadMissingImagesToDrive = async (
  images: Array<{ hash: string; dataUrl: string }>,
  accessToken: string,
  onProgress?: (done: number, total: number) => void
): Promise<{ uploaded: number; skipped: number }> => {
  if (!images.length) return { uploaded: 0, skipped: 0 };

  // 1. 로컬 업로드 완료 캐시 + 진행 중 락 확인: 변동된 신규 이미지가 없으면 Google Drive API 호출 자체를 생략
  const localUploaded = getUploadedHashesCache();
  const candidates = images.filter(img => !localUploaded.has(img.hash) && !inFlightImageHashes.has(img.hash));
  if (candidates.length === 0) {
    return { uploaded: 0, skipped: images.length };
  }

  candidates.forEach(img => inFlightImageHashes.add(img.hash));
  try {
    const folderId = await findOrCreateCustomImagesFolder(accessToken);
    const existingMap = await listCustomImageFilesInDrive(accessToken);
    Object.keys(existingMap).forEach(h => localUploaded.add(h));
    // 기존 Drive 목록 확인 즉시 캐시 저장 (이후 배치 중단 시에도 재조회 방지)
    saveUploadedHashesCache(localUploaded);

    const missing = candidates.filter(img => !existingMap[img.hash]);
    const skipped = images.length - missing.length;
    if (missing.length === 0) {
      return { uploaded: 0, skipped };
    }

    let uploaded = 0;
    const BATCH_SIZE = 4;

    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      const batch = missing.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (item) => {
          const metadata = {
            name: `${item.hash}.json`,
            parents: [folderId],
            mimeType: 'application/json'
          };
          const boundary = '-------314159265358979323846';
          const body =
            `\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
            JSON.stringify(metadata) +
            `\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
            JSON.stringify({ hash: item.hash, dataUrl: item.dataUrl }) +
            `\r\n--${boundary}--`;

          const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': `multipart/related; boundary="${boundary}"`
            },
            body
          });
          if (!res.ok) {
            throw new Error(`이미지(${item.hash.slice(0, 8)}) 드라이브 업로드 실패`);
          }
          localUploaded.add(item.hash);
          uploaded++;
          onProgress?.(uploaded, missing.length);
        })
      );
      // 배치 완료마다 즉시 캐시 저장 (중간 타임아웃/중단 시에도 완료된 이미지는 재업로드 안 함)
      saveUploadedHashesCache(localUploaded);
    }

    return { uploaded, skipped };
  } finally {
    candidates.forEach(img => inFlightImageHashes.delete(img.hash));
  }
};

export const downloadImagesFromDrive = async (
  hashes: string[],
  accessToken: string,
  onProgress?: (done: number, total: number) => void
): Promise<Record<string, string>> => {
  const result: Record<string, string> = {};
  if (!hashes.length) return result;

  const existingMap = await listCustomImageFilesInDrive(accessToken);
  const targets = hashes.filter(h => Boolean(existingMap[h]));
  let done = 0;
  const BATCH_SIZE = 5;

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (hash) => {
        const fileId = existingMap[hash];
        try {
          const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (res.ok) {
            const parsed = await res.json();
            if (parsed?.dataUrl) {
              result[hash] = parsed.dataUrl;
            }
          }
        } catch (err) {
          console.warn(`[GoogleDrive] 이미지(${hash.slice(0, 8)}) 복원 스킵:`, err);
        } finally {
          done++;
          onProgress?.(done, targets.length);
        }
      })
    );
  }

  return result;
};
