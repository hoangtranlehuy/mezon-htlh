import { useReference } from '@mezon/core';
import { ActionEmitEvent } from '@mezon/mobile-components';
import { useTheme } from '@mezon/mobile-ui';
import { MAX_FILE_SIZE } from '@mezon/utils';
import {
	CameraRoll,
	PhotoIdentifier,
	cameraRollEventEmitter
} from '@react-native-camera-roll/camera-roll';
import { useGalleryPermission } from 'apps/mobile/src/app/hooks/useImage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	ActivityIndicator,
	Alert,
	AppState,
	DeviceEventEmitter,
	Dimensions,
	EmitterSubscription,
	Linking,
	PermissionsAndroid,
	Platform,
	View
} from 'react-native';
import RNFS from 'react-native-fs';
import { FlatList } from 'react-native-gesture-handler';
import * as ImagePicker from 'react-native-image-picker';
import { CameraOptions } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import { IFile } from '../../../../../../componentUI/MezonImagePicker';
import GalleryItem from './components/GalleryItem';

export const { height } = Dimensions.get('window');
interface IProps {
	onPickGallery: (files: IFile | any) => void;
	currentChannelId: string;
}

const Gallery = ({ onPickGallery, currentChannelId }: IProps) => {
	const { themeValue } = useTheme();
	const { t } = useTranslation(['qrScanner']);
	const [hasPermission, setHasPermission] = useState(false);
	const [photos, setPhotos] = useState<PhotoIdentifier[]>([]);
	const [currentAlbums, setCurrentAlbums] = useState<string>('All');
	const [pageInfo, setPageInfo] = useState(null);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const haveLoadMorePhoto = useRef<any>(false);
	const { removeAttachmentByIndex, attachmentFilteredByChannelId } = useReference(currentChannelId);
	const { requestGalleryPermission, timerRef } = useGalleryPermission();

	const isDisableSelectAttachment = useMemo(() => {
		if (!attachmentFilteredByChannelId) return false;
		const { files } = attachmentFilteredByChannelId;
		return files?.length >= 10;
	}, [attachmentFilteredByChannelId]);

	useEffect(() => {
		checkAndRequestPermissions();

		return () => {
			timerRef?.current && clearTimeout(timerRef.current);
		};
	}, []);

	useEffect(() => {
		const subscription = AppState.addEventListener('change', async (nextAppState) => {
			if (nextAppState === 'active') {
				loadPhotos(currentAlbums);
			}
		});

		return () => {
			subscription.remove();
		};
	}, [currentAlbums]);

	useEffect(() => {
		const subscription: EmitterSubscription = cameraRollEventEmitter.addListener('onLibrarySelectionChange', (_event) => {
			if (!haveLoadMorePhoto?.current) {
				loadPhotos(currentAlbums);
				haveLoadMorePhoto.current = true;
			}
		});

		return () => {
			if (subscription) {
				subscription.remove();
			}
		};
	}, [currentAlbums]);

	const checkAndRequestPermissions = async () => {
		const hasPermission = await requestGalleryPermission();
		if (hasPermission) {
			loadPhotos(currentAlbums);
		} else {
			await requestGalleryPermission();
		}
	};

	const loadPhotos = async (album, after = null) => {
		if (isLoadingMore) return;

		setIsLoadingMore(true);
		try {
			const res = await CameraRoll.getPhotos({
				first: 32,
				assetType: album === 'All Videos' ? 'Videos' : 'All',
				...(!!pageInfo && !!after && { after: after }),
				include: ['filename', 'fileSize', 'fileExtension', 'imageSize', 'orientation'],
				groupTypes: album === 'All' ? 'All' : 'Album',
				groupName: album === 'All' || album === 'All Videos' ? null : album
			});

			setPhotos(after ? [...photos, ...res.edges] : res.edges);
			setPageInfo(res.page_info);
		} catch (error) {
			console.error('Error loading photos', error);
		} finally {
			setIsLoadingMore(false);
		}
	};

	useEffect(() => {
		const showKeyboard = DeviceEventEmitter.addListener(ActionEmitEvent.ON_SELECT_ALBUM, (value) => {
			loadPhotos(value);
			setCurrentAlbums(value);
		});
		return () => {
			showKeyboard.remove();
		};
	}, []);

	const renderItem = ({ item }) => {
		return (
			<GalleryItem
				item={item}
				themeValue={themeValue}
				isDisableSelectAttachment={isDisableSelectAttachment}
				attachmentFilteredByChannelId={attachmentFilteredByChannelId}
				onOpenCamera={onOpenCamera}
				handleGalleryPress={handleGalleryPress}
				handleRemove={handleRemove}
			/>
		);
	};

	const handleGalleryPress = useCallback(
		async (file: PhotoIdentifier) => {
			try {
				const image = file?.node?.image;
				const type = file?.node?.type;
				const name = file?.node?.image?.filename || file?.node?.image?.uri;
				const size = file?.node?.image?.fileSize;

				if (size && size >= MAX_FILE_SIZE) {
					Toast.show({
						type: 'error',
						text1: 'File size cannot exceed 50MB!'
					});
					return;
				}

				let filePath = image?.uri;

				if (Platform.OS === 'ios' && filePath.startsWith('ph://')) {
					const ms = new Date().getTime();
					const ext = image.extension;
					const destPath = `${RNFS.CachesDirectoryPath}/${ms}.${ext}`;

					if (type && type.startsWith('video')) {
						filePath = await RNFS.copyAssetsVideoIOS(filePath, destPath);
					} else {
						filePath = await RNFS.copyAssetsFileIOS(filePath, destPath, image.width, image.height);
					}
				}

				const fileFormat: IFile = {
					uri: filePath,
					type: Platform.OS === 'ios' ? `${file?.node?.type}/${image?.extension}` : file?.node?.type,
					size: size,
					name,
					fileData: filePath,
					width: image?.width,
					height: image?.height
				};

				onPickGallery(fileFormat);
			} catch (err) {
				console.error('Error: ', err);
			}
		},
		[onPickGallery]
	);

	const requestCameraPermission = async () => {
		try {
			if (Platform.OS === 'android') {
				const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
				if (granted === PermissionsAndroid.RESULTS.GRANTED) {
					setHasPermission(true);
					return true;
				} else {
					Alert.alert(
						t('cameraPermissionDenied'),
						t('pleaseAllowCamera'),
						[
							{ text: t('cancel'), style: 'cancel' },
							{ text: t('openSettings'), onPress: () => Linking.openSettings() }
						],
						{ cancelable: false }
					);
					return false;
				}
			} else if (Platform.OS === 'ios') {
				setHasPermission(true);
				return true;
			}
		} catch (err) {
			console.warn(err);
			return false;
		}
		return false;
	};

	const onOpenCamera = useCallback(async () => {
		if (!hasPermission) {
			const granted = await requestCameraPermission();
			if (!granted) return;
		}

		const options = {
			durationLimit: 10000,
			mediaType: 'photo'
		};

		ImagePicker.launchCamera(options as CameraOptions, async (response) => {
			if (response.didCancel) {
				console.warn('User cancelled camera');
			} else if (response.errorCode) {
				console.error('Camera Error: ', response.errorMessage);
			} else {
				const file = response.assets[0];

				const fileFormat: IFile = {
					uri: file?.uri,
					name: file?.fileName,
					type: file?.type,
					size: file?.fileSize,
					fileData: file?.uri,
					width: file?.width,
					height: file?.height
				};

				onPickGallery(fileFormat);
			}
		});
	}, [hasPermission, onPickGallery]);

	const handleLoadMore = async () => {
		if (pageInfo?.has_next_page) {
			await loadPhotos(currentAlbums, pageInfo.end_cursor);
		}
	};

	const handleRemove = useCallback(
		(filename: string) => {
			const index = attachmentFilteredByChannelId?.files?.findIndex((file) => file.filename === filename);
			removeAttachmentByIndex(currentChannelId, index);
		},
		[attachmentFilteredByChannelId, currentChannelId, removeAttachmentByIndex]
	);

	return (
		<View style={{ flex: 1 }}>
			<FlatList
				data={[{ isUseCamera: true }, ...photos]}
				numColumns={3}
				renderItem={renderItem}
				keyExtractor={(item, index) => `${index.toString()}_gallery_${item?.node?.id}`}
				initialNumToRender={10}
				maxToRenderPerBatch={10}
				updateCellsBatchingPeriod={50}
				windowSize={10}
				scrollEventThrottle={16}
				removeClippedSubviews={true}
				viewabilityConfig={{
					itemVisiblePercentThreshold: 50,
					minimumViewTime: 300
				}}
				contentOffset={{ x: 0, y: 0 }}
				disableVirtualization
				style={{
					maxHeight: height * 0.8
				}}
				onEndReached={handleLoadMore}
				onEndReachedThreshold={0.5}
				ListFooterComponent={() => isLoadingMore && <ActivityIndicator size="small" color={themeValue.text} />}
			/>
		</View>
	);
};

export default Gallery;
