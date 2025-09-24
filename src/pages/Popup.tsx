import React, { useEffect, useState, useRef } from 'react';
import { ConfigProvider, Layout, Typography, theme, Card, Button, Input, Form, Space, Alert, Tabs, Select, Dropdown, Menu, Tooltip, Modal, List, Avatar, Tag } from 'antd';
import { WalletOutlined, PlusOutlined, LockOutlined, UnlockOutlined, GlobalOutlined, SettingOutlined, DownOutlined, UserOutlined, SwapOutlined, CopyOutlined, ImportOutlined, KeyOutlined, EditOutlined } from '@ant-design/icons';
import browser from 'webextension-polyfill';
import NetworkManagement from './NetworkManagement';
import Settings from './Settings';
import TokenList from './TokenList';
import { Token } from '../wallet/TokenManager';
import { I18nContext, useI18nProvider, useI18n } from '../hooks/useI18n';
import "./Popup.css";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface WalletState {
  isLocked: boolean;
  hasWallet: boolean;
  accounts: any[];
  currentAccountIndex: number;
  network: {
    chainId: string;
    name: string;
    rpcUrl: string;
  };
}

interface Network {
  id: string;
  chainId: string;
  name: string;
  rpcUrl: string;
  symbol: string;
  blockExplorerUrl?: string;
  isMainnet?: boolean;
  isTestnet?: boolean;
  isDefault?: boolean;
  category?: 'mainnet' | 'testnet';
}

function PopupContent() {
  const { t, locale } = useI18n();
  const [walletState, setWalletState] = useState<WalletState | null>(null);
  const [renderKey, setRenderKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<'main' | 'networks' | 'settings'>('main');
  const [networks, setNetworks] = useState<Network[]>([]);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [editingAccountIndex, setEditingAccountIndex] = useState<number | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [balance, setBalance] = useState<string>('0.00');
  const [balanceLoading, setBalanceLoading] = useState(false);
  const balanceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadWalletState();
    loadNetworks();
  }, []);

  // 监听语言变化，触发重新渲染
  useEffect(() => {
    setRenderKey(prev => prev + 1);
  }, [locale]);

  // 设置余额轮询
  useEffect(() => {
    if (walletState?.hasWallet && !walletState.isLocked) {
      setBalanceLoading(true);
      loadBalance();

      // 启动轮询
      balanceIntervalRef.current = setInterval(() => {
        loadBalance();
      }, 6000); // 6秒更新一次
    }

    // 清理轮询
    return () => {
      if (balanceIntervalRef.current) {
        clearInterval(balanceIntervalRef.current);
        balanceIntervalRef.current = null;
      }
    };
  }, [walletState?.hasWallet, walletState?.isLocked, walletState?.currentAccountIndex, walletState?.network.chainId]);

  const loadWalletState = async () => {
    try {
      const response = await browser.runtime.sendMessage({ type: 'GET_WALLET_STATE' });
      setWalletState(response.state);
    } catch (err) {
      setError('Failed to load wallet state');
    } finally {
      setLoading(false);
    }
  };

  const loadNetworks = async () => {
    try {
      const response = await browser.runtime.sendMessage({ type: 'GET_NETWORKS' });
      if (response.success) {
        setNetworks(response.networks);
      }
    } catch (err) {
      console.error('Failed to load networks:', err);
    }
  };

  const loadBalance = async () => {
    if (!walletState?.accounts[walletState.currentAccountIndex]?.address) return;

    try {

      const response = await browser.runtime.sendMessage({
        type: 'GET_BALANCE',
        address: walletState.accounts[walletState.currentAccountIndex].address,
        chainId: walletState.network.chainId
      });

      if (response.success) {
        setBalance(response.balance);
      }
    } catch (err) {
      console.error('Failed to load balance:', err);
    } finally {
      setBalanceLoading(false);
    }
  };

  const createWallet = async (values: { password: string }) => {
    try {
      setLoading(true);
      const response = await browser.runtime.sendMessage({
        type: 'CREATE_WALLET',
        password: values.password
      });

      if (response.success) {
        // 显示助记词
        alert(`Your mnemonic phrase: ${response.mnemonic}\n\nPlease save it securely!`);
        await loadWalletState();
      }
    } catch (err) {
      console.error('Create wallet error:', err);
      setError('Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  const importWallet = async (values: { mnemonic: string; password: string }) => {
    try {
      setLoading(true);
      const response = await browser.runtime.sendMessage({
        type: 'IMPORT_WALLET',
        mnemonic: values.mnemonic,
        password: values.password
      });

      if (response.success) {
        await loadWalletState();
      }
    } catch (err) {
      setError('Failed to import wallet');
    } finally {
      setLoading(false);
    }
  };

  const unlockWallet = async (values: { password: string }) => {
    try {
      setLoading(true);
      const response = await browser.runtime.sendMessage({
        type: 'UNLOCK_WALLET',
        password: values.password
      });

      if (response.success) {
        await loadWalletState();
      } else {
        setError('Incorrect password');
      }
    } catch (err) {
      setError('Failed to unlock wallet');
    } finally {
      setLoading(false);
    }
  };

  const lockWallet = async () => {
    try {
      await browser.runtime.sendMessage({ type: 'LOCK_WALLET' });
      await loadWalletState();
    } catch (err) {
      setError('Failed to lock wallet');
    }
  };

  const createAccount = async () => {
    try {
      const derivedAccounts = walletState!.accounts.filter(acc => acc.type === 'derived');
      const response = await browser.runtime.sendMessage({
        type: 'CREATE_ACCOUNT',
        name: `Account ${derivedAccounts.length + 1}`
      });

      if (response.account) {
        await loadWalletState();
        // Auto-switch to the newly created account
        const newAccountIndex = walletState!.accounts.length;
        await switchAccount(newAccountIndex);
        // 广播账户变更事件
        window.dispatchEvent(new CustomEvent('accountsChanged', {
          detail: { accountIndex: newAccountIndex }
        }));
      }
    } catch (err) {
      setError('Failed to create account');
    }
  };

  const importAccount = async (values: { name: string; privateKey: string }) => {
    try {
      const response = await browser.runtime.sendMessage({
        type: 'IMPORT_ACCOUNT_FROM_PRIVATE_KEY',
        name: values.name,
        privateKey: values.privateKey
      });

      if (response.success) {
        await loadWalletState();
        setImportModalVisible(false);
        // Auto-switch to the newly imported account
        const newAccountIndex = walletState!.accounts.length;
        await switchAccount(newAccountIndex);
        // 广播账户变更事件
        window.dispatchEvent(new CustomEvent('accountsChanged', {
          detail: { accountIndex: newAccountIndex }
        }));
      } else {
        setError(response.error || 'Failed to import account');
      }
    } catch (err) {
      setError('Failed to import account');
    }
  };

  const switchNetwork = async (network: Network) => {
    try {
      const response = await browser.runtime.sendMessage({
        type: 'SWITCH_NETWORK',
        chainId: network.chainId,
        name: network.name,
        rpcUrl: network.rpcUrl
      });

      if (response.success) {
        await loadWalletState();
        // 广播网络变更事件
        window.dispatchEvent(new CustomEvent('chainChanged', {
          detail: { chainId: network.chainId }
        }));
      }
    } catch (err) {
      setError('Failed to switch network');
    }
  };

  const switchAccount = async (accountIndex: number) => {
    try {
      const response = await browser.runtime.sendMessage({
        type: 'SWITCH_ACCOUNT',
        index: accountIndex
      });

      if (response.success) {
        await loadWalletState();
        setAccountModalVisible(false);
        // 广播账户变更事件
        window.dispatchEvent(new CustomEvent('accountsChanged', {
          detail: { accountIndex }
        }));
      }
    } catch (err) {
      setError('Failed to switch account');
    }
  };

  const handleRenameAccount = (accountIndex: number) => {
    setEditingAccountIndex(accountIndex);
    setRenameModalVisible(true);
  };

  const renameAccount = async (values: { name: string }) => {
    try {
      const response = await browser.runtime.sendMessage({
        type: 'RENAME_ACCOUNT',
        accountIndex: editingAccountIndex,
        newName: values.name
      });

      if (response.success) {
        await loadWalletState();
        setRenameModalVisible(false);
        setEditingAccountIndex(null);
      } else {
        setError(response.error || 'Failed to rename account');
      }
    } catch (err) {
      setError('Failed to rename account');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // 可以添加成功提示
    }).catch(() => {
      setError('Failed to copy to clipboard');
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Token management functions
  const loadTokens = async () => {
    if (!walletState?.hasWallet || walletState.isLocked) return;

    const currentAccount = walletState.accounts[walletState.currentAccountIndex];
    if (!currentAccount) return;

    setTokenLoading(true);
    try {
      const response = await browser.runtime.sendMessage({
        type: 'GET_TOKENS',
        accountAddress: currentAccount.address,
        chainId: walletState.network.chainId
      });

      if (response.success) {
        setTokens(response.tokens || []);
      }
    } catch (err) {
      console.error('Failed to load tokens:', err);
    } finally {
      setTokenLoading(false);
    }
  };

  const handleAddToken = async (tokenData: Omit<Token, 'chainId'>): Promise<boolean> => {
    if (!walletState?.hasWallet || walletState.isLocked) return false;

    const currentAccount = walletState.accounts[walletState.currentAccountIndex];
    if (!currentAccount) return false;

    try {
      const response = await browser.runtime.sendMessage({
        type: 'ADD_TOKEN',
        accountAddress: currentAccount.address,
        chainId: walletState.network.chainId,
        tokenAddress: tokenData.address,
        symbol: tokenData.symbol,
        name: tokenData.name,
        decimals: tokenData.decimals
      });

      if (response.success) {
        await loadTokens();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to add token:', err);
      return false;
    }
  };

  const handleRemoveToken = async (tokenAddress: string): Promise<boolean> => {
    if (!walletState?.hasWallet || walletState.isLocked) return false;

    const currentAccount = walletState.accounts[walletState.currentAccountIndex];
    if (!currentAccount) return false;

    try {
      const response = await browser.runtime.sendMessage({
        type: 'REMOVE_TOKEN',
        accountAddress: currentAccount.address,
        chainId: walletState.network.chainId,
        tokenAddress
      });

      if (response.success) {
        await loadTokens();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to remove token:', err);
      return false;
    }
  };

  const handleRefreshTokenBalance = async (tokenAddress: string): Promise<void> => {
    // 这里可以实现刷新单个Token余额的逻辑
    // 暂时只重新加载所有Token
    await loadTokens();
  };

  const handleRefreshAllTokenBalances = async (): Promise<void> => {
    await loadTokens();
  };

  // Load tokens when wallet state changes
  useEffect(() => {
    loadTokens();
  }, [walletState?.currentAccountIndex, walletState?.network.chainId]);

  const renderWalletSetup = () => (
    <Tabs defaultActiveKey="create">
      <TabPane tab={t('wallet.createWallet')} key="create">
        <Form onFinish={createWallet} layout="vertical">
          <Form.Item
            name="password"
            label={t('wallet.password')}
            rules={[{ required: true, message: t('wallet.enterPassword') }]}
          >
            <Input.Password placeholder={t('wallet.enterWalletPassword')} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {t('wallet.createWallet')}
            </Button>
          </Form.Item>
        </Form>
      </TabPane>

      <TabPane tab={t('wallet.importWallet')} key="import">
        <Form onFinish={importWallet} layout="vertical">
          <Form.Item
            name="mnemonic"
            label={t('wallet.mnemonic')}
            rules={[{ required: true, message: t('wallet.enterMnemonic') }]}
          >
            <Input.TextArea placeholder={t('wallet.enterMnemonic')} rows={3} />
          </Form.Item>
          <Form.Item
            name="password"
            label={t('wallet.password')}
            rules={[{ required: true, message: t('wallet.enterPassword') }]}
          >
            <Input.Password placeholder={t('wallet.enterWalletPassword')} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {t('wallet.importWallet')}
            </Button>
          </Form.Item>
        </Form>
      </TabPane>
    </Tabs>
  );

  const renderUnlockScreen = () => (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <LockOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          <Title level={4}>{t('wallet.walletLocked')}</Title>
        </div>
        <Form onFinish={unlockWallet} layout="vertical">
          <Form.Item
            name="password"
            rules={[{ required: true, message: t('wallet.enterPassword') }]}
          >
            <Input.Password placeholder={t('wallet.enterPasswordToUnlock')} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {t('wallet.unlockWallet')}
            </Button>
          </Form.Item>
        </Form>
      </Space>
    </Card>
  );

  const renderWalletDashboard = () => {
    const currentNetwork = networks.find(n => n.chainId === walletState!.network.chainId);

    const mainnetNetworks = networks.filter(n => n.category === 'mainnet' || n.isMainnet);
    const testnetNetworks = networks.filter(n => n.category === 'testnet' || n.isTestnet);
    const customNetworks = networks.filter(n => !n.isDefault && !n.isMainnet && !n.isTestnet);

    const networkMenu = (
      <Menu>
        {/* Mainnet Networks */}
        <Menu.ItemGroup title={t('wallet.mainnetNetworks')}>
          {mainnetNetworks.map(network => (
            <Menu.Item
              key={network.id}
              onClick={() => switchNetwork(network)}
              style={{
                backgroundColor: network.chainId === walletState!.network.chainId ? '#f0f8ff' : 'transparent'
              }}
            >
              <Space>
                <GlobalOutlined />
                <span>{network.name}</span>
                {network.chainId === walletState!.network.chainId && <span style={{ color: '#1890ff' }}>✓</span>}
              </Space>
            </Menu.Item>
          ))}
        </Menu.ItemGroup>

        {/* Testnet Networks */}
        {testnetNetworks.length > 0 && (
          <Menu.ItemGroup title={t('wallet.testnetNetworks')}>
            {testnetNetworks.map(network => (
              <Menu.Item
                key={network.id}
                onClick={() => switchNetwork(network)}
                style={{
                  backgroundColor: network.chainId === walletState!.network.chainId ? '#f0f8ff' : 'transparent'
                }}
              >
                <Space>
                  <GlobalOutlined />
                  <span>{network.name}</span>
                  {network.chainId === walletState!.network.chainId && <span style={{ color: '#1890ff' }}>✓</span>}
                </Space>
              </Menu.Item>
            ))}
          </Menu.ItemGroup>
        )}

        {/* Custom Networks */}
        {customNetworks.length > 0 && (
          <Menu.ItemGroup title={t('wallet.customNetworks')}>
            {customNetworks.map(network => (
              <Menu.Item
                key={network.id}
                onClick={() => switchNetwork(network)}
                style={{
                  backgroundColor: network.chainId === walletState!.network.chainId ? '#f0f8ff' : 'transparent'
                }}
              >
                <Space>
                  <GlobalOutlined />
                  <span>{network.name}</span>
                  {network.chainId === walletState!.network.chainId && <span style={{ color: '#1890ff' }}>✓</span>}
                </Space>
              </Menu.Item>
            ))}
          </Menu.ItemGroup>
        )}

        <Menu.Divider />
        <Menu.Item key="manage" onClick={() => setCurrentPage('networks')}>
          <Space>
            <SettingOutlined />
            <span>{t('settings.networkManagement')}</span>
          </Space>
        </Menu.Item>
      </Menu>
    );

    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Dropdown overlay={networkMenu} trigger={['click']}>
              <Button type="text" style={{ padding: 0 }}>
                <Space>
                  <GlobalOutlined />
                  <Text strong>{currentNetwork?.name || walletState!.network.name}</Text>
                  <DownOutlined />
                </Space>
              </Button>
            </Dropdown>

            <Space>
              <Tooltip title={t('settings.settings')}>
                <Button
                  type="text"
                  icon={<SettingOutlined />}
                  onClick={() => setCurrentPage('settings')}
                  size="small"
                />
              </Tooltip>
              <Button
                type="text"
                icon={<LockOutlined />}
                onClick={lockWallet}
                size="small"
              >
                {t('wallet.lock')}
              </Button>
            </Space>
          </Space>
        </Card>

      <Card
        title={t('account.currentAccount')}
        extra={
          <Space>
            <Button
              type="text"
              size="small"
              icon={<SwapOutlined />}
              onClick={() => setAccountModalVisible(true)}
            >
              {t('account.switchAccount')}
            </Button>
            <Dropdown
              overlay={
                <Menu>
                  <Menu.Item key="create" icon={<PlusOutlined />} onClick={createAccount}>
                    {t('account.mnemonicCreated')}
                  </Menu.Item>
                  <Menu.Item key="import" icon={<ImportOutlined />} onClick={() => setImportModalVisible(true)}>
                    {t('account.externalImport')}
                  </Menu.Item>
                </Menu>
              }
              trigger={['click']}
            >
              <Button type="primary" size="small" icon={<PlusOutlined />}>
                {t('wallet.addAccount')}
              </Button>
            </Dropdown>
          </Space>
        }
      >
        {walletState!.accounts[walletState!.currentAccountIndex] && (
          <div style={{ padding: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <Space>
                <Text strong>{walletState!.accounts[walletState!.currentAccountIndex].name}</Text>
                <Tag
                  color={walletState!.accounts[walletState!.currentAccountIndex].type === 'derived' ? 'blue' : 'orange'}
                  icon={walletState!.accounts[walletState!.currentAccountIndex].type === 'derived' ? <WalletOutlined /> : <KeyOutlined />}
                >
                  {walletState!.accounts[walletState!.currentAccountIndex].type === 'derived' ? t('account.mnemonicCreated') : t('account.externalImport')}
                </Tag>
              </Space>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(walletState!.accounts[walletState!.currentAccountIndex].address)}
              />
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {formatAddress(walletState!.accounts[walletState!.currentAccountIndex].address)}
            </Text>
          </div>
        )}
      </Card>

      <Card title={t('wallet.balance')} loading={balanceLoading}>
        <Space>
          <Text strong style={{ fontSize: '16px' }}>{balance}</Text>
          <Text type="secondary">
            {networks.find(n => n.chainId === walletState!.network.chainId)?.symbol || 'ETH'}
          </Text>
        </Space>
      </Card>

      <TokenList
        tokens={tokens}
        loading={tokenLoading}
        accountAddress={walletState!.accounts[walletState!.currentAccountIndex]?.address || ''}
        chainId={walletState!.network.chainId}
        onAddToken={handleAddToken}
        onRemoveToken={handleRemoveToken}
        onRefreshBalance={handleRefreshTokenBalance}
        onRefreshAllBalances={handleRefreshAllTokenBalances}
      />
    </Space>
    );
  };

  if (loading) {
    return (
      <Layout style={{ minHeight: '600px', width: '400px' }}>
        <Content style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text>Loading...</Text>
        </Content>
      </Layout>
    );
  }

  // Show network management page
  if (currentPage === 'networks') {
    return (
      <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
        <NetworkManagement onBack={() => setCurrentPage('main')} />
      </ConfigProvider>
    );
  }

  // Show settings page
  if (currentPage === 'settings') {
    return (
      <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
        <Settings
          onBack={() => setCurrentPage('main')}
          walletState={walletState}
          onRefresh={loadWalletState}
        />
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
      <Layout style={{ minHeight: '600px', width: '400px' }}>
        <Header style={{
          background: '#001529',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Title level={4} style={{ color: 'white', margin: 0 }}>
            <WalletOutlined /> Universal Wallet
          </Title>
        </Header>

        <Content style={{ padding: '20px' }}>
          {error && <Alert message={error} type="error" style={{ marginBottom: '16px' }} />}

          {!walletState?.hasWallet && renderWalletSetup()}
          {walletState?.hasWallet && walletState.isLocked && renderUnlockScreen()}
          {walletState?.hasWallet && !walletState.isLocked && renderWalletDashboard()}
        </Content>

        {/* 账户选择模态框 */}
        <Modal
          title={t('wallet.selectAccount')}
          open={accountModalVisible}
          onCancel={() => setAccountModalVisible(false)}
          footer={null}
          width={380}
        >
          <List
            dataSource={walletState?.accounts || []}
            renderItem={(account, index) => (
              <List.Item
                style={{
                  cursor: 'pointer',
                  backgroundColor: index === walletState?.currentAccountIndex ? '#f0f8ff' : 'transparent',
                  borderRadius: '4px',
                  marginBottom: '4px',
                  padding: '4px 12px'
                }}
                onClick={() => switchAccount(index)}
                actions={[
                  <Button
                    key="edit"
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRenameAccount(index);
                    }}
                  />,
                  <Button
                    key="copy"
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(account.address);
                    }}
                  />
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>{account.name}</Text>
                      <Tag
                        color={account.type === 'derived' ? 'blue' : 'orange'}
                        icon={account.type === 'derived' ? <WalletOutlined /> : <KeyOutlined />}
                      >
                        {account.type === 'derived' ? t('account.mnemonicCreated') : t('account.externalImport')}
                      </Tag>
                      {index === walletState?.currentAccountIndex && (
                        <Text type="success" style={{ fontSize: '12px' }}>{t('account.current')}</Text>
                      )}
                    </Space>
                  }
                  description={
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {formatAddress(account.address)}
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        </Modal>

        {/* 私钥导入模态框 */}
        <Modal
          title={t('account.externalImport')}
          open={importModalVisible}
          onCancel={() => setImportModalVisible(false)}
          footer={null}
          width={400}
        >
          <Form
            layout="vertical"
            onFinish={importAccount}
            initialValues={{ name: `Imported Account ${walletState && walletState?.accounts.filter(acc => acc.type === 'imported').length + 1 || 1}` }}
          >
            <Alert
              message={t('account.securityWarning')}
              description={t('account.privateKeySecurityWarning')}
              type="warning"
              showIcon
              style={{ marginBottom: '16px' }}
            />

            <Form.Item
              name="name"
              label={t('account.accountName')}
              rules={[{ required: true, message: t('account.enterAccountName') }]}
            >
              <Input placeholder={t('account.enterAccountName')} />
            </Form.Item>

            <Form.Item
              name="privateKey"
              label={t('account.privateKey')}
              rules={[
                { required: true, message: t('account.enterPrivateKey') },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const cleanKey = value.replace(/^0x/, '');
                    if (!/^[a-fA-F0-9]{64}$/.test(cleanKey)) {
                      return Promise.reject(new Error(t('account.validPrivateKeyRequired')));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <Input.TextArea
                placeholder={t('account.inputPrivateKeyPlaceholder')}
                rows={3}
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>

            <Form.Item>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={() => setImportModalVisible(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="primary" htmlType="submit" icon={<ImportOutlined />}>
                  {t('account.importAccount')}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* 重命名账户模态框 */}
        <Modal
          title={t('wallet.renameAccount')}
          open={renameModalVisible}
          onCancel={() => {
            setRenameModalVisible(false);
            setEditingAccountIndex(null);
          }}
          footer={null}
          width={400}
        >
          <Form
            layout="vertical"
            onFinish={renameAccount}
            initialValues={{
              name: editingAccountIndex !== null ? walletState?.accounts[editingAccountIndex]?.name : ''
            }}
          >
            <Form.Item
              name="name"
              label={t('account.accountName')}
              rules={[
                { required: true, message: t('account.enterAccountName') },
                { max: 20, message: t('account.maxAccountNameLength') }
              ]}
            >
              <Input placeholder={t('wallet.newAccountName')} maxLength={20} />
            </Form.Item>

            <Form.Item>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={() => {
                  setRenameModalVisible(false);
                  setEditingAccountIndex(null);
                }}>
                  {t('common.cancel')}
                </Button>
                <Button type="primary" htmlType="submit" icon={<EditOutlined />}>
                  {t('wallet.rename')}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Layout>
    </ConfigProvider>
  );
}

export default function Popup() {
  const i18nProvider = useI18nProvider();

  return (
    <I18nContext.Provider value={i18nProvider}>
      <PopupContent />
    </I18nContext.Provider>
  );
}
