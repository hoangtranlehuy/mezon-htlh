import { Signal } from '../utils';
import { useSignal } from './useSignal';
import { useSignalEffect } from './useSignalEffect';
import { useStateRef } from './useStateRef';
import { useSyncEffect } from './useSyncEffect';

type SyncResolver<T> = () => T;
type AsyncResolver<T> = (setter: (newValue: T) => void) => void;
type Resolver<T> = SyncResolver<T> | AsyncResolver<T>;

function useDerivedSignal<T>(resolver: SyncResolver<T>, dependencies: readonly any[]): Signal<T>;
function useDerivedSignal<T>(resolver: AsyncResolver<T>, dependencies: readonly any[], isAsync: true): Signal<T>;
function useDerivedSignal<T>(dependency: T): Signal<T>;

function useDerivedSignal<T>(resolverOrDependency: Resolver<T> | T, dependencies?: readonly any[], isAsync = false) {
	const resolver = dependencies ? (resolverOrDependency as Resolver<T>) : () => resolverOrDependency as T;
	dependencies ??= [resolverOrDependency];

	const [getValue, setValue] = useSignal<T>();
	const resolverRef = useStateRef(resolver);

	function runCurrentResolver() {
		const currentResolver = resolverRef.current;
		if (isAsync) {
			(currentResolver as AsyncResolver<T>)(setValue);
		} else {
			setValue((currentResolver as SyncResolver<T>)());
		}
	}

	useSyncEffect(runCurrentResolver, dependencies);

	useSignalEffect(runCurrentResolver, dependencies);

	return getValue as Signal<T>;
}

export default useDerivedSignal;
