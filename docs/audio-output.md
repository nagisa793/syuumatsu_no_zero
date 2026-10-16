# 現行の音声出力（v89）

アカリの技名と開始時の全ボイスを廃止。公開物のアカリ音声ファイルと再生スクリプト、取得・デコード処理、発声を待つ処理、画面内のボイス表記と素材欄を削除した。技の登録・実行とホームからの転送は `command-audio.js` の短い電子音へ置き換える。モデル・OS読み上げ・音声サービスは使わない。SEの専用ゲインと包絡を分け、スライダーを0にすると再生中の操作音も即座に消音する。BGMと同じAudioContextを使い、曲のゲインと再生位置には触れない。

通常戦とERROR戦の曲をホームBGMに合わせて再調整。曲の構成・テンポ・長さ・ループのサンプル数は維持し、通常戦は−7.8dB、ERROR戦は−3.3dBの固定減衰を事前に音源へ適用した。ゲーム中の自動音量変更はしない。旧音源と新音源のデコード後のサンプル数は一致し、音量を揃えた波形の相関は通常戦0.9996、ERROR戦0.9999。

| 音源 | 全体 LUFS | 最大3秒 LUFS | 最大0.4秒 LUFS |
| --- | ---: | ---: | ---: |
| ホーム（変更なし） | −14.2 | −13.6 | −12.1 |
| 通常戦・修正前 | −7.6 | −6.1 | −4.3 |
| 通常戦・修正後 | −15.4 | −13.9 | −12.1 |
| ERROR戦・修正前 | −11.5 | −10.6 | −9.3 |
| ERROR戦・修正後 | −15.1 | −14.2 | −12.9 |

`ffmpeg`のEBU R128計測。数値が0に近いほど大きい。曲の最も盛り上がる部分もホームBGMの範囲に収める。生成手順は `scripts/balance-bgm.py`、計測結果は `audio-mix-v89.json`。`tests/audio.cjs`と`tests/dialogue.cjs`でSE・ミュート・再開・技の進行を確認。iPhone実機の音出しは未確認。

以下はv69〜72の変更履歴であり、過去の音声入力やボイスの記述は現行仕様ではない。

# 音声出力の復帰と上部UI（v69）

上部の作品名、バッテリー下の説明、全画面ボタンを撤去。HUDは標準54px、スマホ52pxの高さへ詰めた。

iOSのWeb Audioの既定のambient分類と、音声入力などによるinterrupted状態から復帰できない処理を修正。AudioSessionに対応するブラウザでは、AudioContext生成時にplaybackを指定する。ゲームはマイクを取得しない。最初のタップで短い無音バッファを通して出力を準備する。

開始・確定・画面復帰・音声セッションの復帰時に、suspendedとinterruptedの双方から出力を再開する。同じBGMソースと音量を維持し、AudioContextがclosedの場合だけ作り直して再生位置を引き継ぐ。非表示中やOSが音声を専有している間は復帰を要求しない。明示されたミュートとゲームの一時停止も維持する。

確認:

- `node tests/audio.cjs`: 開始時の設定、BGMとSEのソース、各中断からの復帰、閉じたコンテキストの復帰、曲位置と音量、ミュートと一時停止、上部要素の撤去。
- `NODE_PATH="$CODEX_PRIMARY_RUNTIME_NODE_MODULES" node tests/dialogue.cjs`: 現行入力と戦闘の回帰確認。
- BGMのMP3をffmpegで最後までデコードして異常がないことを確認。

APIイベントは模擬して検証した。iPhone実機での音出しとキーボード表示中の描画は、この環境では未確認。

仕様資料: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state
https://developer.mozilla.org/en-US/docs/Web/API/AudioSession/type

## キーボード音声入力中の再生（v70）

入力欄が選択され、OSの音声セッションがinterruptedになった時だけambientへ切り替え、混在可能な音声出力として再開を一度試す。BGMのソース・位置・音量は保ち、SEも同じAudioContextから出力する。キーボードを開いただけではplaybackを変えない。混在設定でactiveになっても音声入力の終了は判定できないため、入力欄からフォーカスが外れるまではambientを維持する。その後playbackへ戻す。これによりactiveとinterruptedの設定往復を防ぐ。

音声入力開始時の再開を一切試さなかったv69からの変更。OSが同時再生を許可したケースと、再開を拒んだケースをtests/audio.cjsで分けて検証した。拒否中にresume要求を繰り返さず、音声入力を停止させたり新しいマイクを取得したりしない。診断API readAudioで出力状態を確認できる。

AudioSession APIはOSの音声優先権を変更するAPIではない。OSが再生を拒否する場合、Web側の設定で同時再生を強制することはできない。ambient出力はiPhoneの消音設定に従う場合がある。iPhone実機で音声入力中のBGM・SE継続を確認できていないため、解決確認済みとは扱わない。

仕様: https://w3c.github.io/audio-session/
Safari実装: https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/audio/ios/AudioSessionIOS.mm

## 確定後の入力継続・戦闘音声の復帰（v71）

v70のambient切り替えは撤回。ambientは消音スイッチに従うため、入力欄にフォーカスが残った状態でBGMが無音になる条件を増やしていた。出力はplaybackで固定し、入力欄を開閉しても出力カテゴリを往復させない。

戦闘・TARGET・イントロで再生が必要な間はAudioContextを監視する。OSのinterrupted状態が解放されたら再開し、resumeのPromiseが解決しない場合も1.5秒後には再試行できる。自動再試行は500ms以上空け、フレームごとの要求連打を防ぐ。BGMソース・再生位置・音量を保持する。初回の取得・デコード失敗は最大3回まで再試行し、古い再生フラグが残っていても復帰する。

音声で「エンター」「リセット」が入っても、入力中のvalueは書き換えない。処理した接頭部分を内部で記録するため、OS側の編集範囲が続いていても後続の音声を受け取れる。物理的な確定時は編集フォーカスをいったん解除してから空にし、同じ入力要素にフォーカス・選択位置を戻す。入力要素自体は交換しない。処理結果は登録された正式な技名で表示し、入力した生の文では上書きしない。

tests/dialogue.cjsでは、ライブ入力を書き換えると後続の文字を受け取れなくなるネイティブ編集モデルで、音声確定2回・物理確定・その後の音声入力を検証した。tests/audio.cjsでは未完了resume、初回デコード失敗、OS中断解除、入力中のカテゴリ維持を検証した。iPhone実機のDictationでの検証は未実施。

OSが音声出力を強制中断している間、Webにはそれを解除する権限がない。v71はこの停止自体を解消したものではなく、入力破壊・消音カテゴリの残留・中断後の復帰漏れを修正したもの。

消音カテゴリ仕様: https://developer.apple.com/library/archive/documentation/Audio/Conceptual/AudioSessionProgrammingGuide/AudioSessionCategoriesandModes/AudioSessionCategoriesandModes.html
音声入力のcompositionイベントに関する報告: https://bugs.webkit.org/show_bug.cgi?id=261764

## タップ式への変更（v72・現行）

音声入力・テキスト入力を廃止。Akariの技名は事前生成したWAVをBGM/SEと同じAudioContextから再生する。OS音声入力やOS読み上げに切り替えるAPIは使わない。ボイス同士はタップ順に並べ、BGMのソースやゲインは変更しない。詳しくはtap-controls.md。過去のv69–71の入力欄・音声入力の記述は現行UIには該当しない。
