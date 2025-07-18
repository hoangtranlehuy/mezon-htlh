import { useBottomSheetModal } from '@gorhom/bottom-sheet';
import { Icons } from '@mezon/mobile-components';
import { baseColor, size } from '@mezon/mobile-ui';
import { useNavigation } from '@react-navigation/native';
import { forwardRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import MezonMenu, { IMezonMenuItemProps, IMezonMenuSectionProps } from '../../componentUI/MezonMenu';
import { APP_SCREEN } from '../../navigation/ScreenTypes';

export const SendTokenUser = forwardRef(() => {
	const { t } = useTranslation(['screenStack']);
	const { dismiss } = useBottomSheetModal();
	const navigation = useNavigation<any>();
	const sendTokenOptions: IMezonMenuItemProps[] = useMemo(
		() => [
			{
				onPress: () => {
					navigation.push(APP_SCREEN.WALLET, {
						activeScreen: 'transfer'
					});
					dismiss();
				},
				title: t('settingStack.sendToken'),
				isShow: true,
				icon: <Icons.SendMoney height={size.s_24} width={size.s_24} color={baseColor.gray} />
			},
			{
				onPress: () => {
					navigation.push(APP_SCREEN.WALLET, {
						activeScreen: 'manage'
					});
					dismiss();
				},
				title: t('settingStack.walletManagement'),
				isShow: true,
				icon: <Icons.SendMoney height={size.s_24} width={size.s_24} rotate={-1} color={baseColor.gray} />
			},
			{
				onPress: () => {
					navigation.push(APP_SCREEN.WALLET, {
						activeScreen: 'history'
					});
					dismiss();
				},
				title: t('settingStack.historyTransaction'),
				isShow: true,
				icon: <Icons.History height={size.s_24} width={size.s_24} color={baseColor.gray} />
			}
		],
		[]
	);

	const menu: IMezonMenuSectionProps[] = [
		{
			items: sendTokenOptions
		}
	];

	return (
		<View style={{ paddingHorizontal: size.s_20 }}>
			<MezonMenu menu={menu} />
		</View>
	);
});
