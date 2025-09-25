import { ActionEmitEvent } from '@mezon/mobile-components';
import { useTheme } from '@mezon/mobile-ui';
import useTabletLandscape from 'apps/mobile/src/app/hooks/useTabletLandscape';
import { DeviceEventEmitter, Text, TouchableOpacity, View } from 'react-native';
import { style } from './styles';

interface IReasonPopupProps {
	title: string;
	confirmText: string;
	content?: string;
}
export default function ReasonPopup({ title, confirmText, content }: IReasonPopupProps) {
	const isTabletLandscape = useTabletLandscape();
	const { themeValue } = useTheme();
	const styles = style(themeValue, isTabletLandscape);

	function handleConfirm() {
		DeviceEventEmitter.emit(ActionEmitEvent.ON_TRIGGER_MODAL, { isDismiss: true });
	}

	return (
		<View style={styles.main}>
			<View style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.title}>{title}</Text>
				</View>

				<Text style={styles.contentText}>{content || ''}</Text>

				<TouchableOpacity style={styles.button} onPress={handleConfirm}>
					<Text style={styles.buttonText}>{confirmText}</Text>
				</TouchableOpacity>
			</View>
			<TouchableOpacity style={styles.backdrop} onPress={handleConfirm} />
		</View>
	);
}
