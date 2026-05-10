import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Screen } from './Screen';
import { Header } from './Header';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';

interface BasePageScaffoldProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  loading?: boolean;
  loadingMessage?: string;
  error?: boolean;
  errorTitle?: string;
  errorMessage?: string;
  onRetry?: () => void;
  retryText?: string;
  footer?: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export interface ListPageScaffoldProps extends BasePageScaffoldProps {
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  emptyIcon?: React.ReactNode;
  children: React.ReactNode;
}

export interface DetailPageScaffoldProps extends BasePageScaffoldProps {
  children: React.ReactNode;
}

function renderHeader({
  title,
  showBack,
  onBack,
  rightElement,
}: Pick<
  BasePageScaffoldProps,
  'title' | 'showBack' | 'onBack' | 'rightElement'
>) {
  const hasHeader = Boolean(title || showBack || rightElement);

  if (!hasHeader) {
    return null;
  }

  return (
    <Header
      title={title}
      showBack={showBack}
      onBack={onBack}
      rightElement={rightElement}
    />
  );
}

function renderFooter(footer?: React.ReactNode) {
  if (!footer) {
    return null;
  }

  return <View style={styles.footer}>{footer}</View>;
}

export function ListPageScaffold({
  title,
  showBack,
  onBack,
  rightElement,
  loading,
  loadingMessage,
  error,
  errorTitle,
  errorMessage,
  onRetry,
  retryText,
  footer,
  contentContainerStyle,
  empty,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  emptyIcon,
  children,
}: ListPageScaffoldProps) {
  const hasState = Boolean(loading || error || empty);
  const stateNode = loading ? (
    <LoadingState message={loadingMessage} fullScreen />
  ) : error ? (
    <ErrorState
      title={errorTitle}
      message={errorMessage}
      onRetry={onRetry}
      retryText={retryText}
      fullScreen
    />
  ) : empty ? (
    <EmptyState
      title={emptyTitle || 'No items found'}
      description={emptyDescription}
      actionLabel={emptyActionLabel}
      onAction={onEmptyAction}
      icon={emptyIcon}
    />
  ) : (
    children
  );

  return (
    <Screen>
      {renderHeader({ title, showBack, onBack, rightElement })}
      <View style={[styles.listContent, contentContainerStyle]}>
        {stateNode}
      </View>
      {!hasState ? renderFooter(footer) : null}
    </Screen>
  );
}

export function DetailPageScaffold({
  title,
  showBack,
  onBack,
  rightElement,
  loading,
  loadingMessage,
  error,
  errorTitle,
  errorMessage,
  onRetry,
  retryText,
  footer,
  contentContainerStyle,
  children,
}: DetailPageScaffoldProps) {
  const hasState = Boolean(loading || error);
  const stateNode = loading ? (
    <LoadingState message={loadingMessage} fullScreen />
  ) : error ? (
    <ErrorState
      title={errorTitle}
      message={errorMessage}
      onRetry={onRetry}
      retryText={retryText}
      fullScreen
    />
  ) : (
    children
  );

  return (
    <Screen>
      {renderHeader({ title, showBack, onBack, rightElement })}
      <ScrollView
        contentContainerStyle={[styles.detailContent, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {stateNode}
        {!hasState ? renderFooter(footer) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    flex: 1,
    paddingTop: 20,
    paddingBottom: 28,
  },
  detailContent: {
    flexGrow: 1,
    paddingTop: 20,
    paddingBottom: 32,
  },
  footer: {
    marginTop: 20,
  },
});
