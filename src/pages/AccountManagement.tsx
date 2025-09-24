import React, { useState } from 'react';
import {
  Card,
  List,
  Button,
  Modal,
  Form,
  Input,
  Space,
  message,
  Typography,
  Divider,
  Alert,
  Tooltip
} from 'antd';
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  CopyOutlined,
  ExportOutlined,
  KeyOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import browser from 'webextension-polyfill';
import { useI18n } from '../hooks/useI18n';

const { Text, Paragraph } = Typography;

interface Account {
  address: string;
  name: string;
  index: number;
}

interface AccountManagementProps {
  accounts: Account[];
  currentAccountIndex: number;
  onRefresh: () => void;
}

export default function AccountManagement({ accounts, currentAccountIndex, onRefresh }: AccountManagementProps) {
  const { t } = useI18n();
  const [privateKeyModalVisible, setPrivateKeyModalVisible] = useState(false);
  const [mnemonicModalVisible, setMnemonicModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [privateKey, setPrivateKey] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleExportPrivateKey = async (account: Account) => {
    setSelectedAccount(account);
    setPrivateKeyModalVisible(true);
    setPrivateKey('');
    setShowPrivateKey(false);
    form.resetFields();
  };

  const handleGetPrivateKey = async (values: { password: string }) => {
    if (!selectedAccount) return;

    setLoading(true);
    try {
      const response = await browser.runtime.sendMessage({
        type: 'GET_PRIVATE_KEY',
        password: values.password,
        accountIndex: selectedAccount.index
      });

      if (response.success) {
        setPrivateKey(response.privateKey);
        message.success(t('account.getPrivateKeySuccess'));
      } else {
        message.error(response.error || t('account.wrongPassword'));
      }
    } catch (error) {
      message.error(t('account.getPrivateKeyFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportMnemonic = async () => {
    setMnemonicModalVisible(true);
    setMnemonic('');
    setShowMnemonic(false);
    form.resetFields();
  };

  const handleGetMnemonic = async (values: { password: string }) => {
    setLoading(true);
    try {
      const response = await browser.runtime.sendMessage({
        type: 'GET_MNEMONIC',
        password: values.password
      });

      if (response.success) {
        setMnemonic(response.mnemonic);
        message.success(t('account.getMnemonicSuccess'));
      } else {
        message.error(response.error || t('account.wrongPassword'));
      }
    } catch (error) {
      message.error(t('account.getMnemonicFailed'));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success(`${type}${t('account.copiedToClipboard')}`);
    } catch (error) {
      message.error(t('account.copyFailed'));
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {/* 账户列表 */}
      <Card title={t('account.accountList')}>
        <List
          dataSource={accounts}
          renderItem={(account, index) => (
            <List.Item
              actions={[
                <Tooltip title={t('account.viewPrivateKey')} key="private-key">
                  <Button
                    type="text"
                    size="small"
                    icon={<KeyOutlined />}
                    onClick={() => handleExportPrivateKey(account)}
                  />
                </Tooltip>,
                <Tooltip title={t('common.copy')} key="copy">
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => copyToClipboard(account.address, t('account.address'))}
                  />
                </Tooltip>
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    {account.name}
                    {index === currentAccountIndex && <Text type="success">{t('account.currentAccount')}</Text>}
                  </Space>
                }
                description={account.address}
              />
            </List.Item>
          )}
        />
      </Card>

      {/* 钱包备份 */}
      <Card title={t('account.walletBackup')}>
        <Alert
          message={t('account.securityWarning')}
          description={t('account.backupReminder')}
          type="warning"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        <Button
          type="primary"
          icon={<FileTextOutlined />}
          onClick={handleExportMnemonic}
        >
          {t('account.exportMnemonic')}
        </Button>
      </Card>

      {/* 私钥查看模态框 */}
      <Modal
        title={`${t('account.viewPrivateKeyTitle')} - ${selectedAccount?.name}`}
        open={privateKeyModalVisible}
        onCancel={() => {
          setPrivateKeyModalVisible(false);
          setPrivateKey('');
          setShowPrivateKey(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Alert
          message={t('account.securityAlert')}
          description={t('account.privateKeyWarning')}
          type="error"
          showIcon
          style={{ marginBottom: '16px' }}
        />

        {!privateKey ? (
          <Form form={form} onFinish={handleGetPrivateKey} layout="vertical">
            <Form.Item
              name="password"
              label={t('account.enterWalletPassword')}
              rules={[{ required: true, message: t('wallet.enterPassword') }]}
            >
              <Input.Password placeholder={t('account.enterPasswordToView')} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                {t('account.confirmView')}
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Divider />
            <Space align="start">
              <Text strong>{t('account.privateKeyLabel')}</Text>
              <Button
                type="text"
                size="small"
                icon={showPrivateKey ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                onClick={() => setShowPrivateKey(!showPrivateKey)}
              />
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(privateKey, t('account.privateKey'))}
              />
            </Space>
            <Paragraph
              copyable={false}
              style={{
                backgroundColor: '#f5f5f5',
                padding: '12px',
                borderRadius: '4px',
                fontFamily: 'monospace',
                wordBreak: 'break-all'
              }}
            >
              {showPrivateKey ? privateKey : '•'.repeat(64)}
            </Paragraph>
          </Space>
        )}
      </Modal>

      {/* 助记词导出模态框 */}
      <Modal
        title={t('account.exportMnemonicTitle')}
        open={mnemonicModalVisible}
        onCancel={() => {
          setMnemonicModalVisible(false);
          setMnemonic('');
          setShowMnemonic(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Alert
          message={t('account.importantReminder')}
          description={t('account.mnemonicWarning')}
          type="error"
          showIcon
          style={{ marginBottom: '16px' }}
        />

        {!mnemonic ? (
          <Form form={form} onFinish={handleGetMnemonic} layout="vertical">
            <Form.Item
              name="password"
              label={t('account.enterWalletPassword')}
              rules={[{ required: true, message: t('wallet.enterPassword') }]}
            >
              <Input.Password placeholder={t('account.enterPasswordToExport')} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                {t('account.confirmExport')}
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Divider />
            <Space align="start">
              <Text strong>{t('account.mnemonicLabel')}</Text>
              <Button
                type="text"
                size="small"
                icon={showMnemonic ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                onClick={() => setShowMnemonic(!showMnemonic)}
              />
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(mnemonic, t('wallet.mnemonic'))}
              />
            </Space>
            <Paragraph
              copyable={false}
              style={{
                backgroundColor: '#f5f5f5',
                padding: '12px',
                borderRadius: '4px',
                fontFamily: 'monospace',
                wordBreak: 'break-all'
              }}
            >
              {showMnemonic ? mnemonic : '•'.repeat(mnemonic.length)}
            </Paragraph>
            <Alert
              type="info"
              message={t('account.mnemonicSaveInstruction')}
              showIcon
            />
          </Space>
        )}
      </Modal>
    </Space>
  );
}