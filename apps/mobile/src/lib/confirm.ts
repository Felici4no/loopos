/**
 * Confirmação de ações destrutivas — cross-platform.
 *
 * Alert.alert é NO-OP no react-native-web: a confirmação nunca aparecia no
 * browser e o "X" parecia decorativo (nada era excluído). Aqui usamos
 * window.confirm no web e Alert nativo no iOS/Android, com a mesma API.
 *
 * Uso:
 *   if (await confirmDestructive({ title: 'Excluir treino?', message: '...' })) { ... }
 */

import { Alert, Platform } from 'react-native';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
}

export function confirmDestructive({
  title,
  message,
  confirmLabel = 'Excluir',
}: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    const webConfirm = (globalThis as { confirm?: (msg: string) => boolean }).confirm;
    return Promise.resolve(webConfirm ? webConfirm(`${title}\n\n${message}`) : true);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
