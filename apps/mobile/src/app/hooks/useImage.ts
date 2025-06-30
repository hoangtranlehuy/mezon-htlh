import { appActions, useAppDispatch } from '@mezon/store';
import {
	CameraRoll,
	iosReadGalleryPermission,
	iosRefreshGallerySelection,
	iosRequestReadWriteGalleryPermission
} from '@react-native-camera-roll/camera-roll';
import { useCallback, useRef } from 'react';
import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import RNFetchBlob from 'rn-fetch-blob';

export const useGalleryPermission = () => {
	const dispatch = useAppDispatch();
	const timerRef = useRef<NodeJS.Timeout | null>(null);

	const openAppSettings = () => {
		if (Platform.OS === 'ios') {
			Linking.openURL('app-settings:');
		} else {
			Linking.openSettings();
		}
	};

	const alertOpenSettings = (title?: string, desc?: string) => {
		Alert.alert(title || 'Photo Permission', desc || 'App needs access to your photo library', [
			{ text: 'Cancel', style: 'cancel' },
			{ text: 'OK', onPress: openAppSettings }
		]);
	};

	const getCheckPermissionPromise = async () => {
		try {
			if (Platform.OS === 'android') {
				if (Platform.Version >= 33) {
					const hasImagePermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
					const hasVideoPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO);
					return hasImagePermission && hasVideoPermission;
				} else {
					return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
				}
			}
			return false;
		} catch (error) {
			console.warn('Permission check error:', error);
			return false;
		}
	};

	const requestGalleryPermission = async () => {
		if (Platform.OS === 'android') {
			dispatch(appActions.setIsFromFCMMobile(true));
			const hasPermission = await getCheckPermissionPromise();
			if (hasPermission) {
				return true;
			}
			try {
				// For Android 13+ (API 33+)
				if (Platform.Version >= 33) {
					const granted = await PermissionsAndroid.requestMultiple([
						PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
						PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO
					]);
					timerRef.current = setTimeout(() => dispatch(appActions.setIsFromFCMMobile(false)), 2000);
					if (
						granted['android.permission.READ_MEDIA_IMAGES'] !== PermissionsAndroid.RESULTS.GRANTED ||
						granted['android.permission.READ_MEDIA_VIDEO'] !== PermissionsAndroid.RESULTS.GRANTED
					) {
						alertOpenSettings();
					}
					return (
						granted['android.permission.READ_MEDIA_IMAGES'] === PermissionsAndroid.RESULTS.GRANTED &&
						granted['android.permission.READ_MEDIA_VIDEO'] === PermissionsAndroid.RESULTS.GRANTED
					);
				}
				// For Android 12 and below
				else {
					const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE, {
						title: 'Photo Library Access',
						message: 'This app needs access to your photo library.',
						buttonNeutral: 'Ask Me Later',
						buttonNegative: 'Cancel',
						buttonPositive: 'OK'
					});
					timerRef.current = setTimeout(() => dispatch(appActions.setIsFromFCMMobile(false)), 2000);
					if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
						alertOpenSettings();
					}
					return granted === PermissionsAndroid.RESULTS.GRANTED;
				}
			} catch (err) {
				console.warn('Permission request error:', err);
				return false;
			}
		} else if (Platform.OS === 'ios') {
			dispatch(appActions.setIsFromFCMMobile(true));
			const result = await iosReadGalleryPermission('readWrite');
			timerRef.current = setTimeout(() => dispatch(appActions.setIsFromFCMMobile(false)), 2000);
			if (result === 'not-determined' || result === 'denied') {
				const requestResult = await iosRequestReadWriteGalleryPermission();
				return requestResult === 'granted' || requestResult === 'limited';
			} else if (result === 'limited') {
				await iosRefreshGallerySelection();
			}
			return result === 'granted' || result === 'limited';
		}
		return false;
	};

	return { requestGalleryPermission, timerRef };
};

export function useImage() {
	const dispatch = useAppDispatch();
	const { requestGalleryPermission } = useGalleryPermission();

	const downloadImage = useCallback(
		async (imageUrl: string, type: string) => {
			try {
				const hasPermission = await requestGalleryPermission();
				if (!hasPermission) {
					throw new Error('Permission denied');
				}
				const response = await RNFetchBlob.config({
					fileCache: true,
					appendExt: type
				}).fetch('GET', imageUrl);

				if (response.info().status === 200) {
					const filePath = response.path();
					return filePath;
				} else {
					console.error('Error downloading image:', response.info());
					return null;
				}
			} catch (error) {
				console.error('Error downloading image:', error);
				Toast.show({
					text1: `Error downloading image: ${error}`,
					type: 'error'
				});
			} finally {
				dispatch(appActions.setLoadingMainMobile(false));
			}
		},
		[dispatch]
	);

	const saveImageToCameraRoll = useCallback(
		async (filePath: string, type: string, isShowSuccessToast = true) => {
			try {
				await CameraRoll.save(filePath, { type: type === 'video' ? 'video' : 'photo' });

				isShowSuccessToast &&
					Toast.show({
						text1: 'Save successfully',
						type: 'info'
					});
			} catch (err) {
				Toast.show({
					text1: 'Error saving image',
					type: 'error'
				});
			} finally {
				if (Platform.OS === 'android') {
					await RNFetchBlob.fs.unlink(filePath);
				}
				dispatch(appActions.setLoadingMainMobile(false));
			}
		},
		[dispatch]
	);

	return {
		downloadImage,
		saveImageToCameraRoll
	};
}
