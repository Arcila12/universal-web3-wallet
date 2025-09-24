import React, { useState, useEffect } from 'react';
import { ConfigProvider, Layout, Typography, theme, Card, Button, Input, Form, Alert, Space } from 'antd';
import { LockOutlined, UnlockOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import browser from 'webextension-polyfill';
import { I18nContext, useI18nProvider, useI18n } from '../hooks/useI18n';
import "./Popup.css";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

interface PendingRequest {
  id: string;
  type: 'connection' | 'transaction' | 'sign' | 'typedData';
  origin?: string;
}

function UnlockWalletContent() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadPendingRequest();
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
    }
  };

  const handleUnlock = async (values: { password: string }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await browser.runtime.sendMessage({
        type: 'UNLOCK_WALLET',
        password: values.password
      });

      if (response.success) {
        // 解锁成功，通知后台脚本继续处理原始请求
        await browser.runtime.sendMessage({
          type: 'WALLET_UNLOCKED_CONTINUE_REQUEST'
        });
        window.close();
      } else {
        setError(t('wallet.wrongPassword'));
      }
    } catch (error: any) {
      setError(error.message || t('wallet.walletUnlockFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      if (pendingRequest) {
        await browser.runtime.sendMessage({
          type: 'REJECT_REQUEST',
          id: pendingRequest.id
        });
      }
      window.close();
    } catch (error) {
      console.error('Failed to reject request:', error);
      window.close();
    }
  };

  const getRequestTypeText = (type: string) => {
    switch (type) {
      case 'connection':
        return t('wallet.connectionRequest');
      case 'transaction':
        return t('transaction.confirmTransaction');
      case 'sign':
      case 'typedData':
        return t('transaction.signMessage');
      default:
        return t('wallet.unlockRequired');
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
        <Card>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <LockOutlined style={{ fontSize: '48px', color: '#faad14' }} />
              <Title level={4} style={{ margin: '16px 0 8px' }}>
                {t('wallet.walletLocked')}
              </Title>
              {pendingRequest && (
                <Text type="secondary">
                  {t('wallet.unlockRequiredFor')} {getRequestTypeText(pendingRequest.type)}
                </Text>
              )}
              {pendingRequest?.origin && (
                <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginTop: '8px' }}>
                  {t('wallet.requestFrom')}: {pendingRequest.origin}
                </Text>
              )}
            </div>

            <Alert
              message={t('wallet.unlockWarning')}
              description={t('wallet.unlockWarningDesc')}
              type="warning"
              showIcon
            />

            <Form
              form={form}
              layout="vertical"
              onFinish={handleUnlock}
              autoComplete="off"
            >
              <Form.Item
                label={t('wallet.password')}
                name="password"
                rules={[
                  { required: true, message: t('wallet.enterPassword') }
                ]}
              >
                <Input.Password
                  size="large"
                  placeholder={t('wallet.enterPasswordToUnlock')}
                  prefix={<LockOutlined />}
                />
              </Form.Item>

              {error && (
                <Form.Item>
                  <Alert
                    message={error}
                    type="error"
                    showIcon
                  />
                </Form.Item>
              )}

              <Form.Item>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Button
                    size="large"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    htmlType="submit"
                    loading={loading}
                    icon={<UnlockOutlined />}
                  >
                    {t('wallet.unlockWallet')}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Space>
        </Card>
      </Content>
    </Layout>
  );
}

export default function UnlockWallet() {
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
        <UnlockWalletContent />
      </I18nContext.Provider>
    </ConfigProvider>
  );
}