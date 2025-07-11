import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { ActionEmitEvent } from '@mezon/mobile-components';
import { useTheme } from '@mezon/mobile-ui';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, Keyboard, Platform, View } from 'react-native';
import AttachmentPicker from './components/AttachmentPicker';
import BottomKeyboardPicker, { IModeKeyboardPicker } from './components/BottomKeyboardPicker';
import EmojiPicker from './components/EmojiPicker';
import { IMessageActionNeedToResolve } from './types';

interface IProps {
	directMessageId?: string;
	currentChannelId: string;
	currentClanId: string;
}
const PanelKeyboard = React.memo((props: IProps) => {
	const { themeValue, themeBasic } = useTheme();
	const [heightKeyboardShow, setHeightKeyboardShow] = useState<number>(0);
	const [typeKeyboardBottomSheet, setTypeKeyboardBottomSheet] = useState<IModeKeyboardPicker>('text');
	const bottomPickerRef = useRef<BottomSheet>(null);
	const [messageActionNeedToResolve, setMessageActionNeedToResolve] = useState<IMessageActionNeedToResolve | null>(null);

	const onShowKeyboardBottomSheet = useCallback(async (isShow: boolean, type?: IModeKeyboardPicker) => {
		const keyboardHeight = Platform.OS === 'ios' ? 365 : 300;
		if (isShow) {
			setHeightKeyboardShow(keyboardHeight);
			setTypeKeyboardBottomSheet(type);
			Keyboard.dismiss();
		} else {
			setHeightKeyboardShow(0);
			setTypeKeyboardBottomSheet('text');
			bottomPickerRef.current?.forceClose();
		}
	}, []);

	useEffect(() => {
		const eventListener = DeviceEventEmitter.addListener(ActionEmitEvent.ON_PANEL_KEYBOARD_BOTTOM_SHEET, ({ isShow = false, mode = '' }) => {
			onShowKeyboardBottomSheet(isShow, mode as IModeKeyboardPicker);
		});

		return () => {
			eventListener.remove();
		};
	}, [onShowKeyboardBottomSheet]);

	const onClose = useCallback(
		(isFocusKeyboard = true) => {
			onShowKeyboardBottomSheet(false, 'text');
			isFocusKeyboard && DeviceEventEmitter.emit(ActionEmitEvent.SHOW_KEYBOARD, {});
		},
		[onShowKeyboardBottomSheet]
	);

	useEffect(() => {
		const showKeyboard = DeviceEventEmitter.addListener(ActionEmitEvent.SHOW_KEYBOARD, (value) => {
			setMessageActionNeedToResolve(value);
		});
		return () => {
			showKeyboard.remove();
		};
	}, []);

	return (
		<>
			<View
				style={{
					height: Platform.OS === 'ios' || typeKeyboardBottomSheet !== 'text' ? heightKeyboardShow : 0,
					backgroundColor: themeBasic === 'light' ? themeValue.tertiary : themeValue.primary
				}}
			/>
			{heightKeyboardShow !== 0 && typeKeyboardBottomSheet !== 'text' && (
				<BottomKeyboardPicker height={heightKeyboardShow} ref={bottomPickerRef}>
					{typeKeyboardBottomSheet === 'emoji' ? (
						<View style={{ minHeight: heightKeyboardShow }}>
							<EmojiPicker
								onDone={onClose}
								bottomSheetRef={bottomPickerRef}
								directMessageId={props?.directMessageId || ''}
								messageActionNeedToResolve={messageActionNeedToResolve}
							/>
						</View>
					) : typeKeyboardBottomSheet === 'attachment' ? (
						<BottomSheetScrollView stickyHeaderIndices={[0]}>
							<AttachmentPicker currentChannelId={props?.currentChannelId} currentClanId={props?.currentClanId} onCancel={onClose} />
						</BottomSheetScrollView>
					) : (
						<View />
					)}
				</BottomKeyboardPicker>
			)}
		</>
	);
});
export default PanelKeyboard;
