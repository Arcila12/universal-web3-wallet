import React, { useState, useEffect } from 'react';
import {
  Layout,
  Typography,
  Card,
  Button,
  Tabs,
  Space,
  Select,
  message
} from 'antd';
import {
  ArrowLeftOutlined,
  SettingOutlined,
  GlobalOutlined,
  UserOutlined,
  TranslationOutlined
} from '@ant-design/icons';
import browser from 'webextension-polyfill';
import NetworkManagement from './NetworkManagement';
import AccountManagement from './AccountManagement';
import { useI18n } from '../hooks/useI18n';

const { Header, Content } = Layout;
const { Title } = Typography;
const { TabPane } = Tabs;

interface Network {
  id: string;
  chainId: string;
  name: string;
  rpcUrl: string;
  symbol: string;
  blockExplorerUrl?: string;
  isMainnet?: boolean;
  isDefault?: boolean;
}

interface Account {
  address: string;
  name: string;
  index: number;
}

interface SettingsProps {
  onBack: () => void;
  walletState: any;
  onRefresh: () => void;
}

export default function Settings({ onBack, walletState, onRefresh }: SettingsProps) {
  const { t, locale, setLocale } = useI18n();
  const [activeTab, setActiveTab] = useState('networks');
  const [networks, setNetworks] = useState<Network[]>([]);

  useEffect(() => {
    loadNetworks();
  }, []);

  const loadNetworks = async () => {
    try {
      const response = await browser.runtime.sendMessage({ type: 'GET_NETWORKS' });
      if (response.success) {
        setNetworks(response.networks);
      }
    } catch (error) {
      console.error('Failed to load networks:', error);
    }
  };

  const handleNetworkManagementBack = () => {
    loadNetworks();
    onRefresh();
  };

  const handleLanguageChange = async (language: string) => {
    try {
      await browser.storage.local.set({ language });
      setLocale(language as any);
      message.success(t('settings.languageChanged'));
      // 触发整个应用重新渲染
      onRefresh();
    } catch (error) {
      message.error(t('settings.languageChangeFailed'));
      console.error('Failed to save language:', error);
    }
  };

  return (
    <Layout style={{ minHeight: '600px', width: '400px' }}>
      <Header style={{
        background: '#001529',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px'
      }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
          style={{ color: 'white' }}
        />
        <Title level={5} style={{ color: 'white', margin: 0 }}>
          <SettingOutlined /> {t('settings.settings')}
        </Title>
        <div style={{ width: '32px' }} />
      </Header>

      <Content style={{ padding: '16px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          centered
          size="small"
        >
          <TabPane
            tab={
              <Space>
                <GlobalOutlined />
                <span>{t('settings.networkManagement')}</span>
              </Space>
            }
            key="networks"
          >
            <NetworkManagement
              onBack={handleNetworkManagementBack}
              embedded={true}
            />
          </TabPane>

          <TabPane
            tab={
              <Space>
                <UserOutlined />
                <span>{t('settings.accountManagement')}</span>
              </Space>
            }
            key="accounts"
          >
            <AccountManagement
              accounts={walletState?.accounts || []}
              currentAccountIndex={walletState?.currentAccountIndex || 0}
              onRefresh={onRefresh}
            />
          </TabPane>

          <TabPane
            tab={
              <Space>
                <TranslationOutlined />
                <span>{t('settings.languageSettings')}</span>
              </Space>
            }
            key="language"
          >
            <Card title={t('settings.languageSettings')} size="small" style={{ marginTop: '16px' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Typography.Text>{t('settings.selectLanguage')}</Typography.Text>
                <Select
                  value={locale}
                  onChange={handleLanguageChange}
                  style={{ width: '100%' }}
                  options={[
                    { value: 'zh-CN', label: t('languages.zh-CN') },
                    { value: 'en-US', label: t('languages.en-US') },
                    { value: 'ja-JP', label: t('languages.ja-JP') },
                    { value: 'ko-KR', label: t('languages.ko-KR') }
                  ]}
                />
                <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                  {t('settings.languageChangeNote')}
                </Typography.Text>
              </Space>
            </Card>
          </TabPane>
        </Tabs>
      </Content>
    </Layout>
  );
}