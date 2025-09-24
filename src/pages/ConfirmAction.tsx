import React, { useEffect, useState } from 'react';
import { ConfigProvider, Layout, Typography, theme, Card, Button, Space, Alert, Descriptions, Tag, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, WalletOutlined } from '@ant-design/icons';
import browser from 'webextension-polyfill';
import { I18nContext, useI18nProvider, useI18n } from '../hooks/useI18n';
import "./Popup.css";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

interface PendingRequest {
  id: string;
  type: 'connection' | 'transaction' | 'sign' | 'typedData';
  origin?: string;
  data?: any;
  message?: string;
  address?: string;
  transaction?: any;
  typedData?: any;
  timestamp: number;
}

interface WalletState {
  accounts: any[];
  currentAccountIndex: number;
  network: {
    chainId: string;
    name: string;
    symbol: string;
  };
}

function ConfirmActionContent() {
  const { t } = useI18n();
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(null);
  const [walletState, setWalletState] = useState<WalletState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingRequest();
    loadWalletState();
  }, []);

  const loadPendingRequest = async () => {
    try {
      const response = await browser.runtime.sendMessage({
        type: 'GET_PENDING_REQUEST'
      });
      if (response.success && response.request) {
        setPendingRequest(response.request);
      }
    } catch (error) {
      console.error('Failed to load pending request:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWalletState = async () => {
    try {
      const response = await browser.runtime.sendMessage({
        type: 'GET_WALLET_STATE'
      });
      if (response.success) {
        setWalletState(response.state);
      }
    } catch (error) {
      console.error('Failed to load wallet state:', error);
    }
  };

  const handleApprove = async () => {
    if (!pendingRequest) return;

    try {
      await browser.runtime.sendMessage({
        type: 'APPROVE_REQUEST',
        id: pendingRequest.id
      });
      window.close();
    } catch (error) {
      console.error('Failed to approve request:', error);
    }
  };

  const handleReject = async () => {
    if (!pendingRequest) return;

    try {
      await browser.runtime.sendMessage({
        type: 'REJECT_REQUEST',
        id: pendingRequest.id
      });
      window.close();
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const renderConnectionRequest = () => (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <WalletOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          <Title level={4} style={{ margin: '16px 0 8px' }}>
            {t('wallet.connectionRequest')}
          </Title>
          <Text type="secondary">
            {pendingRequest?.origin} {t('wallet.wantsToConnect')}
          </Text>
        </div>

        <Alert
          message={t('wallet.connectionWarning')}
          description={t('wallet.connectionWarningDesc')}
          type="info"
          showIcon
        />

        {walletState && (
          <Descriptions size="small" column={1}>
            <Descriptions.Item label={t('account.account')}>
              {walletState.accounts[walletState.currentAccountIndex]?.name}
            </Descriptions.Item>
            <Descriptions.Item label={t('account.address')}>
              {formatAddress(walletState.accounts[walletState.currentAccountIndex]?.address)}
            </Descriptions.Item>
            <Descriptions.Item label={t('network.network')}>
              {walletState.network.name}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Space>
    </Card>
  );

  const renderTransactionRequest = () => (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#faad14' }} />
          <Title level={4} style={{ margin: '16px 0 8px' }}>
            {t('transaction.confirmTransaction')}
          </Title>
          <Text type="secondary">
            {pendingRequest?.origin}
          </Text>
        </div>

        <Alert
          message={t('transaction.reviewCarefully')}
          description={t('transaction.reviewCarefullyDesc')}
          type="warning"
          showIcon
        />

        {pendingRequest?.transaction && (
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label={t('transaction.to')}>
              {formatAddress(pendingRequest.transaction.to)}
            </Descriptions.Item>
            <Descriptions.Item label={t('transaction.value')}>
              {pendingRequest.transaction.value || '0'} ETH
            </Descriptions.Item>
            <Descriptions.Item label={t('transaction.gasLimit')}>
              {pendingRequest.transaction.gas || pendingRequest.transaction.gasLimit || 'Auto'}
            </Descriptions.Item>
            <Descriptions.Item label={t('transaction.gasPrice')}>
              {pendingRequest.transaction.gasPrice || 'Auto'}
            </Descriptions.Item>
            {pendingRequest.transaction.data && pendingRequest.transaction.data !== '0x' && (
              <Descriptions.Item label={t('transaction.data')}>
                <Text code copyable style={{ fontSize: '10px' }}>
                  {pendingRequest.transaction.data.slice(0, 50)}...
                </Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}

        {walletState && (
          <Descriptions size="small" column={1}>
            <Descriptions.Item label={t('transaction.from')}>
              <Space>
                <Text>{walletState.accounts[walletState.currentAccountIndex]?.name}</Text>
                <Tag>{formatAddress(walletState.accounts[walletState.currentAccountIndex]?.address)}</Tag>
              </Space>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Space>
    </Card>
  );

  const renderSignRequest = () => (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#faad14' }} />
          <Title level={4} style={{ margin: '16px 0 8px' }}>
            {t('transaction.signMessage')}
          </Title>
          <Text type="secondary">
            {pendingRequest?.origin}
          </Text>
        </div>

        <Alert
          message={t('transaction.signWarning')}
          description={t('transaction.signWarningDesc')}
          type="warning"
          showIcon
        />

        <Card size="small" title={t('transaction.messageToSign')}>
          <Text code style={{ fontSize: '12px', wordBreak: 'break-all' }}>
            {pendingRequest?.message}
          </Text>
        </Card>

        {walletState && (
          <Descriptions size="small" column={1}>
            <Descriptions.Item label={t('transaction.signingAccount')}>
              <Space>
                <Text>{walletState.accounts[walletState.currentAccountIndex]?.name}</Text>
                <Tag>{formatAddress(pendingRequest?.address || walletState.accounts[walletState.currentAccountIndex]?.address)}</Tag>
              </Space>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Space>
    </Card>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      );
    }

    if (!pendingRequest) {
      return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Text type="secondary">{t('common.noRequestPending')}</Text>
        </div>
      );
    }

    switch (pendingRequest.type) {
      case 'connection':
        return renderConnectionRequest();
      case 'transaction':
        return renderTransactionRequest();
      case 'sign':
      case 'typedData':
        return renderSignRequest();
      default:
        return <Text>Unknown request type</Text>;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        background: '#fff',
        padding: '0 24px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Title level={4} style={{ margin: 0 }}>
          {t('wallet.title')}
        </Title>
      </Header>

      <Content style={{ padding: '24px' }}>
        {renderContent()}
      </Content>

      {pendingRequest && (
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #f0f0f0',
          background: '#fff'
        }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Button
              size="large"
              icon={<CloseCircleOutlined />}
              onClick={handleReject}
            >
              {t('common.reject')}
            </Button>
            <Button
              type="primary"
              size="large"
              icon={<CheckCircleOutlined />}
              onClick={handleApprove}
            >
              {t('common.approve')}
            </Button>
          </Space>
        </div>
      )}
    </Layout>
  );
}

export default function ConfirmAction() {
  const i18nProvider = useI18nProvider();

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <I18nContext.Provider value={i18nProvider}>
        <ConfirmActionContent />
      </I18nContext.Provider>
    </ConfigProvider>
  );
}