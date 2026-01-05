import { ActionEmitEvent } from '@mezon/mobile-components';
import { Attributes } from '@mezon/mobile-ui';
import type { ChannelsEntity } from '@mezon/store-mobile';
import { channelsActions, getStore, listChannelRenderAction, threadsActions } from '@mezon/store-mobile';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, Text } from 'react-native';
import { markdownStyles, renderChannelIcon } from '../..';

type RenderHashtagItemProps = {
	clanId: string;
	channelThreadId: string;
	text: string;
	themeValue?: Attributes;
	hashtagKey?: string;
	isUnReadChannel?: boolean;
	isLastMessage?: boolean;
	isBuzzMessage?: boolean;
	payloadChannel?: ChannelsEntity;
};

export const HashtagContentRender = memo(
	({
		clanId,
		channelThreadId,
		text,
		themeValue,
		hashtagKey,
		isUnReadChannel,
		isLastMessage,
		isBuzzMessage,
		payloadChannel
	}: RenderHashtagItemProps) => {
		const [hashtagContent, setHashtagContent] = useState<string>(payloadChannel?.id === 'undefined' ? 'undefined' : text);
		const store = getStore();
		const [hashtagType, setHashtagType] = useState<number>(payloadChannel?.type);
		const [channelPayload, setChannelPayload] = useState<ChannelsEntity>(payloadChannel);
		const payloadChannelId = useMemo(() => payloadChannel?.id, [payloadChannel]);

		const fetchThread = useCallback(async () => {
			try {
				const response = await store.dispatch(
					threadsActions.fetchThread({
						channelId: '0',
						clanId,
						threadId: channelThreadId
					})
				);
				if (response?.meta?.requestStatus === 'fulfilled') {
					const threadData = (response?.payload as { threads?: ChannelsEntity[] })?.threads?.[0];
					if (!threadData) return;
					store.dispatch(
						listChannelRenderAction.addThreadToListRender({
							clanId: threadData?.clan_id ?? '',
							channel: threadData
						})
					);
					store.dispatch(channelsActions.upsertOne({ clanId: threadData?.clan_id ?? '', channel: threadData }));
					setHashtagContent(threadData?.channel_label);
					setHashtagType(threadData?.type);
					setChannelPayload(threadData);
				} else {
					throw new Error(response?.meta?.requestStatus);
				}
			} catch (error) {
				console.error('error to navigate thread', error);
				return;
			}
		}, []);

		useEffect(() => {
			if (payloadChannelId === 'undefined') {
				fetchThread();
			}
		}, []);

		const onPressHashtag = useCallback(() => {
			if (channelPayload?.channel_id !== 'undefined' && !!channelPayload?.channel_id) {
				DeviceEventEmitter.emit(ActionEmitEvent.ON_CHANNEL_MENTION_MESSAGE_ITEM, channelPayload);
			}
		}, [channelPayload]);

		return (
			<Text
				key={hashtagKey}
				style={[
					themeValue && hashtagContent === 'undefined'
						? markdownStyles(themeValue, isUnReadChannel, isLastMessage, isBuzzMessage).privateChannel
						: themeValue && !!payloadChannelId
							? markdownStyles(themeValue, isUnReadChannel, isLastMessage, isBuzzMessage).hashtag
							: {}
				]}
				onPress={onPressHashtag}
			>
				{renderChannelIcon(hashtagType, payloadChannelId, themeValue)}
				{hashtagContent === 'undefined' ? 'private-channel' : hashtagContent}
			</Text>
		);
	}
);
