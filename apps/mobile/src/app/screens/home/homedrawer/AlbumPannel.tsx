import { ActionEmitEvent, CheckIcon } from '@mezon/mobile-components';
import { baseColor, useTheme } from '@mezon/mobile-ui';
import { useAppDispatch } from '@mezon/store-mobile';
import { Album, CameraRoll } from '@react-native-camera-roll/camera-roll';
import { useEffect, useState } from 'react';
import { DeviceEventEmitter, Image, Text, TouchableOpacity, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useGalleryPermission } from '../../../hooks/useImage';
import { style } from './styles';

interface AlbumWithCover extends Album {
	coverPhoto?: string;
}

interface IAlbumProps {
	valueAlbum?: string;
	onAlbumChange?: (album: string) => void;
}

export const AlbumPanel = ({ valueAlbum, onAlbumChange }: IAlbumProps) => {
	const { themeValue } = useTheme();
	const styles = style(themeValue);
	const [albums, setAlbums] = useState<AlbumWithCover[]>([]);
	const dispatch = useAppDispatch();
	// const timerRef = useRef<any>();
	const { requestGalleryPermission, timerRef } = useGalleryPermission();

	useEffect(() => {
		checkAndRequestPermissions();

		return () => {
			timerRef?.current && clearTimeout(timerRef.current);
		};
	}, []);

	const checkAndRequestPermissions = async () => {
		const hasPermission = await requestGalleryPermission();
		if (hasPermission) {
			getAlbums();
		} else {
			await requestGalleryPermission();
		}
	};

	const handleSelectAlbum = (album: AlbumWithCover) => {
		onAlbumChange(album?.title);
		DeviceEventEmitter.emit(ActionEmitEvent.ON_SELECT_ALBUM, album?.title || '');
	};

	const getAlbums = async () => {
		CameraRoll.getAlbums({
			assetType: 'Photos'
		})
			.then(async (r) => {
				const albumsWithCovers = await Promise.all(
					r?.map(async (album) => {
						const albumPhotos = await CameraRoll.getPhotos({
							first: 1,
							assetType: 'All',
							groupTypes: 'Album',
							groupName: album?.title
						});

						return {
							...album,
							coverPhoto: albumPhotos?.edges?.[0]?.node?.image?.uri
						};
					})
				);

				const albumsVideos = await CameraRoll.getAlbums({ assetType: 'Videos' });

				const allPhotos = await CameraRoll.getPhotos({
					first: 1,
					assetType: 'All'
				});

				const allVideos = await CameraRoll.getPhotos({
					first: 1,
					assetType: 'Videos'
				});

				const allAlbum = {
					id: '0',
					title: 'All',
					count: albumsWithCovers?.reduce((acc, album) => acc + album?.count, 0) || 0,
					coverPhoto: allPhotos?.edges?.[0]?.node?.image?.uri || ''
				} as AlbumWithCover;

				const videoAlbum = {
					id: '1',
					title: 'All Videos',
					count: albumsVideos?.reduce((acc, album) => acc + album?.count, 0) || 0,
					coverPhoto: allVideos?.edges?.[0]?.node?.image?.uri || ''
				} as AlbumWithCover;
				setAlbums([allAlbum, videoAlbum, ...(albumsWithCovers || [])]);
			})
			.catch((err) => {
				console.error(err);
			});
	};

	const renderItem = ({ item }: { item: AlbumWithCover }) => {
		return (
			<TouchableOpacity
				style={styles.albumItem}
				onPress={() => {
					handleSelectAlbum(item);
				}}
			>
				<Image source={{ uri: item?.coverPhoto }} style={styles.albumCoverImage} />
				<View style={styles.albumTitleAndCount}>
					<Text numberOfLines={1} ellipsizeMode="tail" style={styles.albumTitle}>
						{item.title}
					</Text>
					<Text style={styles.albumImageCount}>{item.count}</Text>
				</View>
				{item?.title === valueAlbum && (
					<View style={styles.albumSelectedIcon}>
						<CheckIcon color={baseColor.blurple} />
					</View>
				)}
			</TouchableOpacity>
		);
	};

	return (
		<View style={styles.albumPanel}>
			<FlatList data={albums} keyExtractor={(item, index) => `album_item_${item?.id}_${index}`} renderItem={renderItem} />
		</View>
	);
};
