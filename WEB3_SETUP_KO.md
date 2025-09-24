# Universal Web3 Wallet - 지갑 확장 프로그램 가이드

## 프로젝트 개요

이것은 EIP-1193 표준을 구현한 완전한 Web3 지갑 브라우저 확장 프로그램으로, DApp에 이더리움 제공자 서비스를 제공합니다.

## 핵심 기능

### ✅ 지갑 제공자 기능
- **EIP-1193 Provider**: 표준 이더리움 제공자 인터페이스 구현
- **DApp 주입**: 모든 웹페이지에 `window.ethereum` 객체 주입
- **다중 네트워크 지원**: 이더리움 메인넷 및 기타 EVM 호환 네트워크 지원
- **표준 호환성**: MetaMask 및 기타 지갑 API와 호환

### ✅ 지갑 관리 기능
- **니모닉 생성/가져오기**: 12단어 BIP39 니모닉 구문 지원
- **다중 계정 관리**: HD 지갑 기반 계층적 결정론적 계정 생성
- **비밀번호 암호화**: 니모닉 구문과 개인 키의 로컬 암호화 저장
- **계정 전환**: 여러 계정 간 전환 지원

### ✅ 거래 및 서명 기능
- **거래 서명**: 표준 이더리움 거래 서명 지원
- **메시지 서명**: `personal_sign` 메시지 서명 지원
- **타입 데이터 서명**: `eth_signTypedData_v4` 지원
- **거래 확인**: 모든 서명 및 거래 작업에 대한 팝업 확인

### ✅ 사용자 인터페이스
- **Ant Design UI**: 현대적인 사용자 인터페이스
- **지갑 상태 관리**: 잠금/잠금 해제 상태 관리
- **네트워크 전환**: 다른 이더리움 네트워크 간 전환 지원
- **잔고 표시**: 계정 잔고 조회 및 표시

## 기술 아키텍처

### 핵심 의존성
```json
{
  "ethers": "^6.15.0",           // 거래 및 서명을 위한 이더리움 라이브러리
  "bip39": "^3.1.0",            // 니모닉 생성 및 검증
  "@metamask/eth-sig-util": "^8.2.0", // 서명 유틸리티
  "crypto-js": "^4.2.0",        // 암호화 라이브러리
  "antd": "^5.27.4",            // UI 컴포넌트 라이브러리
  "webextension-polyfill": "^0.10.0" // 브라우저 확장 API 호환성 레이어
}
```

### 파일 구조
```
src/
├── provider/
│   └── EthereumProvider.ts    # EIP-1193 제공자 구현
├── wallet/
│   └── WalletManager.ts       # 핵심 지갑 관리
├── content/
│   └── inject.ts              # 주입 스크립트
├── content.ts                 # 콘텐츠 스크립트
├── background.ts              # 백그라운드 스크립트
├── pages/
│   └── Popup.tsx              # 지갑 UI 인터페이스
├── popup.tsx                  # 팝업 진입점
└── manifest.json              # 확장 프로그램 구성
```

## 개발 및 빌드

### 1. 의존성 설치
```bash
npm install
```

### 2. 개발 모드
```bash
npm run dev
```

### 3. 확장 프로그램 빌드
```bash
npm run build
```

### 4. 확장 프로그램 로드
1. Chrome 브라우저 열기
2. `chrome://extensions/` 이동
3. "개발자 모드" 활성화
4. "압축 해제된 확장 프로그램 로드" 클릭
5. 프로젝트의 `dist` 폴더 선택

## 사용 방법

### 1. 지갑 생성
- 확장 프로그램 아이콘을 클릭하여 지갑 열기
- "지갑 생성" 선택
- 비밀번호 설정 및 니모닉 구문 저장

### 2. DApp 연결
- Web3 지원 웹사이트 방문
- 웹사이트가 자동으로 Universal Wallet 감지
- 지갑 연결 버튼을 클릭하여 연결

### 3. 거래 서명
- DApp이 거래를 시작하면 확인 창이 팝업
- 거래 세부사항 확인 후 확인 클릭
- 지갑이 자동으로 서명하고 거래 전송

## DApp 통합 예제

```javascript
// 지갑 감지
if (window.ethereum) {
  console.log('Universal Wallet detected')
}

// 지갑 연결
const accounts = await window.ethereum.request({
  method: 'eth_requestAccounts'
})

// 거래 전송
const txHash = await window.ethereum.request({
  method: 'eth_sendTransaction',
  params: [{
    from: accounts[0],
    to: '0x...',
    value: '0x...',
    gasLimit: '0x5208'
  }]
})

// 메시지 서명
const signature = await window.ethereum.request({
  method: 'personal_sign',
  params: ['Hello World', accounts[0]]
})
```

## 보안 기능

- **로컬 암호화 저장**: 개인 키와 니모닉 구문을 AES 암호화로 저장
- **비밀번호 보호**: 지갑 작업에 비밀번호 검증 필요
- **확인 팝업**: 모든 서명 작업에 사용자 확인 필요
- **격리된 저장소**: Chrome 확장 프로그램의 독립적인 저장 공간 사용

## 확장 기능

추가할 수 있는 기능:
- **토큰 지원**: ERC-20 토큰 관리 및 전송
- **NFT 표시**: ERC-721/ERC-1155 NFT 관리
- **거래 내역**: 로컬 거래 기록 저장
- **주소록**: 자주 사용하는 주소 관리
- **다국어**: 국제화 지원
- **하드웨어 지갑**: Ledger/Trezor 통합

## 중요 사항

1. **Infura 구성**: `WalletManager.ts`에서 유효한 Infura API 키 구성 필요
2. **네트워크 구성**: 코드에서 더 많은 EVM 호환 네트워크 추가 가능
3. **보안**: 프로덕션 사용 전 철저한 보안 감사 실시
4. **테스트**: 먼저 테스트 네트워크에서 충분한 테스트 권장

이 지갑 확장 프로그램은 완전한 Web3 지갑 기능을 구현하며, DApp에 표준 이더리움 제공자 서비스를 제공할 수 있습니다.