# 音声認識更新の再開用チェックポイント（2026-10-14）

## 状態
未公開・作業途中。実行環境が environment_offline / Environment is not connected で切断されたため、最終検証・ソース同期・公開を完了できていない。
このブランチには再開用の記録だけを保存している。ゲーム実装一式の保存や公開完了を意味しない。公開用 main は変更していない。

## 正規のゲームとソース
- 公開URL: https://shumatsu-zero-battle.nagisa793.chatgpt.site
- project_id: appgprj_6aabde2680ec8191a66e2feeaac51dd0
- GitHub Pagesは正規URLへの転送。
- 公開済み最新: Site version 63 / JS cache version 64。
- 正規ソースの開始コミット: 96247f9b7990d3d8797590cf162a8c33ef4f54b7。
- 正規ソースは Sites の cloudflare_artifact リポジトリ。このGitHubのmainと同一とは限らない。
- 作業ディレクトリ: /workspace/scratch/769286318d85/site-source
- 評価用ディレクトリ: /workspace/scratch/769286318d85/voice-lab
- 再開時は残っている作業ファイルを先に確認する。新規に上書き・初期化しない。

## ユーザーの条件
無料・音声は端末内で認識・PCとスマートフォンのブラウザ対象。有料API不使用。
マイク取得をゲーム処理、TARGET、Pause、勝敗、Auto Mode、認識器の復旧で停止しない。
元の文字起こしを保持し、補正は指示の処理段階で行う。
声の「エンター」で確定。「リセット」で未確定入力を消す。
複数指示は古い順にストック・実行。不発の指示は残さない。
技・アニメーション・戦闘ルール・BGMをこの作業で変更しない。

## モデルの比較と採用
最初の提案はKotoba-Whisperだったが、実際のPCMで比較すると連続数字や短い指示の取りこぼしがあった。語彙の初期プロンプトを渡す設定も出力を崩したので廃止。
高精度側は Whisper large-v3-turbo に変更し、その理由をユーザーへ途中報告済み。
- GPU: onnx-community/whisper-large-v3-turbo
  revision: 360ebcde2559d60bb474678be3c1de9ef347d01a
  dtype: fp16。約1.6GBの初回モデル取得。
- CPU: onnx-community/whisper-small
  revision: 36050c46d777d46dc4b5f43f6d90574fc38f8732
  dtype: q8。約250MBの初回モデル取得。
- 全モデルを最初から同時に読み込まず、WebGPUとshader-f16の利用可否で選択する。
- GPUが利用できなければCPU版。GPUロード失敗時のCPU移行を実装。
- WASM単一スレッドのTurboは5秒音声に57秒かかり、ゲームに不適切なのでCPU経路では使わない。
- 配布するブラウザWASMのSmallでも4.4秒の音声に約11.864秒。この遅延は隠さない。GPUの実機速度は未測定。
- Whisper base、Moonshine Japanese Baseも実PCMで比較したが認識が弱く、不採用。Moonshineの旧日本語モデルはライセンス・ブラウザの共有メモリ制約もある。作業用ファイルを本体へ入れない。

## ランタイムと配置
Transformers.js 3.8.1、ONNX Runtime Web 1.22.0-dev.20250409-89f8206ba4。
voice-labで npm install --ignore-scripts @huggingface/transformers@3.8.1 esbuild@0.25.12 を使用した。通常のinstallは不要なCUDAバイナリ取得で失敗することがある。
dist/vendor/transformers へコピー済み:
- transformers.min.js（自己完結ESM、約888KB）
- ort-wasm-simd-threaded.jsep.mjs と .wasm（約21MB）
- ort.wasm.bundle.min.mjs
- ort-wasm-simd-threaded.mjs と .wasm（約11MB）
- LICENSE、ONNXRUNTIME-LICENSE.txt、SILERO-LICENSE.txt、WHISPER-LICENSE.txt、NOTICE.md
transformers.web.min.js はbare importsが残るため、そのままブラウザへ配布しない。
WASM numThreads=1、proxy=false。ブラウザキャッシュを利用。モデルはHugging Faceから端末へ取得するだけで、録音を外部送信しない。
モデルの初期化後は、実装に用いた共有 createVoiceTranscriber の processor -> model.generate -> tokenizer.decode を使用。語彙強制・初期プロンプトなし。小さい入力レベルは音声波形を増幅して処理するが、元PCMはそのまま保持。
一時的に試した no-speech probe / encoder_outputs 再利用は、精度向上せず、内部API・メモリ上の問題もあったため削除済み。復活させない。

## 作業済みの新規ファイル
- dist/voice-model-core.mjs: モデルID・revisionと共有推論関数。
- dist/voice-whisper-worker.mjs: GPU/CPU選択、ロード進捗、partial/result応答。
- dist/voice-segments.js: VoiceAudioJournal。全PCMを保持し、認識待ちと現発話を分離。
- dist/voice-activity-core.mjs: 512サンプル＋64サンプルcontextのstateful Silero推論。
- dist/voice-activity-worker.mjs: 音声検出用の独立Worker。録音機器を所有しない。
- dist/assets/voice/silero-vad.onnx（約2.3MB）。
  upstream: snakers4/silero-vad commit 60b7ffa243625ebdc1070275a29f18c87843786a、MIT。

## マイクの実装
dist/voice-continuous.js を新実装へ置換済み。
一つのgetUserMedia -> AudioContext -> AudioWorklet -> gain 0 sinkを保持。
dist/voice-worklet.jsは従来と同じ全サンプル取得。16kHz、1600サンプル/100msで連番送信。
キャプチャ音声をactivityPendingで保持し、Sileroの応答後にVoiceAudioJournalへ渡す。分類Worker障害時は未処理PCMをunknownとしてASRへ通す。音声を捨てない。
認識Workerへはコピーを転送し、元音声を認識完了まで保持。失敗時は元記録から再試行。マイクは解放しない。
650msの自然な間で「文字起こしの区切り」だけを作る。無音では技を確定しない。
CPUでは暫定推論を行わず、発話の確定音声を順番に処理して二重推論を避ける。
GPUでは暫定文字を表示するが、トークン途中では実行しない。完成したsnapshot結果に明示のエンターがあるときは、そのサンプル境界まで確定し、後続音声を保持。
未知語からのエンター補正は確定時に行う。
原音・原文を捨てず、readMicrophone().lastTranscriptにも未補正の最後のASR出力を残す。
マイクボタンはON維持・再接続。従来SpeechRecognitionへの自動フォールバックを廃止。

## BGMの誤文字起こし対策
KotobaやWhisperはBGMだけでも言葉を生成するのでSileroで非音声を分類する。入力機器の取得を止めるゲートではない。
通常のBGM録音ではprobability最大0.00776、コマンドは0.997以上。1%に小さくしたコマンド音声も0.997以上。
VADの通常0.5より緩い0.02で分類。不確かな分類・VAD障害時はASRへ通す。
VADでフレームごとの増幅を行う試みはBGMの誤検出を増やしたので削除済み。ASR側の小音量の増幅のみ残す。
1%に小さくしたBGMでは一時的に0.05になることを確認している。BGM誤認ゼロや全人声100%という保証はしない。

## 実行時補正
dist/voice-coercion.js を変更済み:
- エンターに付いた余分な音を、語全体の最短発音距離でエンターへまとめる。余った音を新しいファイル指示として残さない。
- 読み辞書を使った漢字->かな->発音の比較。小書きカナ（ウィ、ファ、ティなど）を一つの音として比較する voicePhonetic を追加。
- ファイルの直後は候補を6種類のファイル名に制約する expectFamily を追加。CPUモデルの「ミング」をエンターと誤解釈する問題を見つけたため。
- 前の確定済みASR断片が「ファイル」だけの場合も、後続の断片のファイル名文脈を引き継ぐ。
- 未知語を拒否する距離の閾値は設けない。聞き取った原文は書き換えない。

## 起動と表示
dist/index.htmlの全JSをv65へ。voice-segments.jsをvoice-continuous.js直前に読み込む。
style.css?v=39。準備進捗のvoicereadyを追加。初回250MB〜1.6GBの説明と音声を端末内処理する説明を遊び方に追加。
voiceボタンはHTMLでdisabled、boot.jsの最後で有効化。低速回線で旧voice関数が起動してしまう競合を防ぐ。
AudioContext.resume拒否もマイクを解放せず再試行する。
エンターの後に句読点だけが残った場合は未確定の次の指示として残さない。

## 検証の実施内容と限界
1. OpenJTalk合成音声: 6ファイル、TARGET、Reset、Enter、Down、Auto、3技を一発話でストック、ゼロゼロツーの追加音声。
2. 自然な日本語音声: kotoba-tech/kotoba-whisper-v2.2の公開sample_audio/sample_diarization_japanese.mp3の21.8秒から4.7秒。人が実際に話した音声。ゲーム指示の自然発声ではない。
3. 旧Vosk、Kotoba、Turbo、Small、Base、Moonshineで同じPCMを比較。Turboは6ファイル名・番号・002/003・3技順序を正しく認識。単独Enterは余計な音を伴うため実行時補正で扱う。
4. 配布するtransformers.min.jsとWASMそのものをNodeで実行し、SmallでガンズNo.2を文字起こし。ブラウザをインストール・操作した検証ではない。
5. tests/voice-continuous.cjsはAPI模擬で入力所有、初期ロード、全戦闘状態、ASR/VAD故障復旧、後続PCM保持、16/44.1/48kHzの全サンプル数を検証。直近の実行は通過。
6. tests/battle.cjsの既存回帰テストは通過。旧SpeechRecognitionイベントのテストはcommand/FIFOの検証として残し、最新輸送層は別途検証。
7. tests/battle.cjs末尾に実際のモデル出力をproductionのContinuousVoice.receive -> processVoiceResults -> 実行時補正 -> ゲーム/FIFOへ通す検証を追加。
   Turboの12コマンドは通過。
   Smallのwingがミング->Enterで失敗したため上述の発音・ファイル文脈修正を追加。
   修正後の最終battle実行（session 72054）の結果は接続切断でまだ読めていない。全通過したとは報告しない。
8. 物理マイク、実ブラウザ、iPhoneでの認識精度・GPU速度は未検証。管理環境でcontrol-browserが提供されていないため、Sitesの指示通りブラウザQAを代替手段で実施していない。

## テスト資産
tests/fixtures/voice に12合成コマンドのFLACとreference.json、turbo-results.json、small-results.json、vosk-results.jsonを作成済み（全体約1.7MB）。
voice-labに生成・評価スクリプトとローカルモデルがある。モデル本体をゲームのGitへ入れる必要はない。
- evaluate-core.mjs: 共有コードをnative ONNX Runtimeで実行。
- browser-engine-check.mjs: 同じ配布WASMをNodeで実行する。ファイル取得だけ適応し、WASMバイナリをenv.wasm.wasmBinaryに明示する。
- evaluate-activity.mjs: 同じstateful Sileroコード、原音と1%音量の比較。
- compare-vosk.cjs: 旧Voskの実際のWASM/モデル比較。
OpenJTalkを入れる場合は CC=gcc CXX=g++ を指定（既定clangがない）。pyopenjtalk 0.4.1を使用。

## まだ必要な修正・作業
- VoiceAudioJournal.seal(end)がsnapshot以降へ古い最大音声確率を引き継ぐ問題がある。prefixに声がありtailがBGMだけだと、tailも声と誤分類する。
  音声chunkごとのstart/end/probability/rms/soundedを保存し、seal(end)でprefixとtailに振り分けて、tailのlastSound・speechProbability・classified・peakを再計算する。
  この修正のapply_patchはenvironment_offlineで失敗し、まだ反映されていない。
- 上述の修正をケース検証（エンターsnapshot後のtailが無音/背景だけ）に追加。
- Small実出力の全12コマンドとGPU/CPU双方のゲーム連携テスト結果を最後まで確認。
- 音声を「ファイル」だけ、次にファイル名、番号、エンターと複数ASR断片へ分けても確定を誤らないことを検証。
- 間違ったHugging Face JSONがブラウザキャッシュへ保存されるケースの再取得も検討。環境内では候補Baseのtokenizer_config.jsonが途中までのサイズになり、curl再取得で直った。
- 不要なVosk worker、vendor/vosk.js、ja-v0-22モデル、旧build-voice-runtime.py、旧voice-worker-native.cjsを削除/更新。今はまだ残っている。
- 新しい推論・ベンダー再構築・PCM検証手順をdocs/continuous-voice.mdに記載。今のドキュメントはv64のVosk説明で未更新。
- source helperで正規ソースにcommit/pushし、同じコミットのdistアーカイブを保存・公開。まだ行っていない。

## 公開手順
Sites project_idとpublic audienceは維持。
最新のwrite credentialを取得。トークンはメモリだけに置き、source helperの非表示stdinへ渡す。ファイル・引数・ログ・この記録へ保存しない。
helper: /root/.codex/plugins/cache/openai-curated-remote/sites/1.0.2-remix-a.1/scripts/site-workflow.mjs
開いた結果はproject_id / checkout_path / commit_shaの3項目で、上述の開始コミット。
完成後のhelperへ完全なopening resultをsourceとして渡し、absolute archivePathを指定。
helperのcommit_shaとarchiveをそのままsave_site_versionへ渡し、得たversion_idをdeploy_site_versionへ。終端succeededとURLを確認してから公開済みと報告する。
現在の公開版を、未検証の途中版やこの記録だけのGitHubブランチへ切り替えない。
