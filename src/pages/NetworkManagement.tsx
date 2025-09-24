import React, { useEffect, useState } from 'react';
import {
  Layout,
  Typography,
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Space,
  message,
  Popconfirm,
  Tag,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  GlobalOutlined,
  LockOutlined
} from '@ant-design/icons';
import browser from 'webextension-polyfill';
import type { ColumnsType } from 'antd/es/table';
import { useI18n } from '../hooks/useI18n';

const { Header, Content } = Layout;
const { Title } = Typography;

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

interface NetworkManagementProps {
  onBack: () => void;
  embedded?: boolean;
}

export default function NetworkManagement({ onBack, embedded = false }: NetworkManagementProps) {
  const { t } = useI18n();
  const [networks, setNetworks] = useState<Network[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<Network | null>(null);
  const [form] = Form.useForm();

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
      message.error(t('network.loadNetworkConfigFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddNetwork = () => {
    setEditingNetwork(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditNetwork = (network: Network) => {
    setEditingNetwork(network);
    form.setFieldsValue(network);
    setModalVisible(true);
  };

  const handleDeleteNetwork = async (network: Network) => {
    try {
      const response = await browser.runtime.sendMessage({
        type: 'REMOVE_NETWORK',
        id: network.id
      });

      if (response.success) {
        message.success(t('network.networkRemoved'));
        loadNetworks();
      } else {
        message.error(response.error || t('network.deleteFailed'));
      }
    } catch (error) {
      message.error(t('network.deleteNetworkFailed'));
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const messageType = editingNetwork ? 'UPDATE_NETWORK' : 'ADD_NETWORK';
      const payload = editingNetwork
        ? { type: messageType, id: editingNetwork.id, ...values }
        : { type: messageType, ...values };

      const response = await browser.runtime.sendMessage(payload);

      if (response.success) {
        message.success(editingNetwork ? t('network.networkUpdated') : t('network.networkAdded'));
        setModalVisible(false);
        loadNetworks();
      } else {
        message.error(response.error || t('network.operationFailed'));
      }
    } catch (error) {
      message.error(t('network.operationFailed'));
    }
  };

  const columns: ColumnsType<Network> = [
    {
      title: t('network.networkName'),
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <GlobalOutlined />
          {text}
          {record.isMainnet && <Tag color="blue">{t('network.mainnet')}</Tag>}
          {record.isTestnet && <Tag color="orange">{t('network.testnet')}</Tag>}
          {record.isDefault && <Tag color="green">{t('network.defaultTag')}</Tag>}
        </Space>
      )
    },
    {
      title: 'Chain ID',
      dataIndex: 'chainId',
      key: 'chainId',
      width: 100
    },
    {
      title: t('network.symbol'),
      dataIndex: 'symbol',
      key: 'symbol',
      width: 100
    },
    {
      title: 'RPC URL',
      dataIndex: 'rpcUrl',
      key: 'rpcUrl',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          {text}
        </Tooltip>
      )
    },
    {
      title: t('network.operations'),
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          {!record.isDefault && !record.isMainnet && !record.isTestnet ? (
            <>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditNetwork(record)}
              />
              <Popconfirm
                title={t('network.confirmDeleteNetwork')}
                onConfirm={() => handleDeleteNetwork(record)}
                okText={t('common.confirm')}
                cancelText={t('common.cancel')}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  danger
                />
              </Popconfirm>
            </>
          ) : (
            <Tooltip title={t('network.cannotModifyDefaultNetwork')}>
              <LockOutlined style={{ color: '#ccc' }} />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  if (embedded) {
    return (
      <div style={{ width: '100%' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddNetwork}
          >
            {t('network.addNetwork')}
          </Button>
        </div>

        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* Mainnet Networks */}
          <Card title={t('network.mainnetNetworks')} size="small">
            <Table
              columns={columns}
              dataSource={networks.filter(n => n.category === 'mainnet' || n.isMainnet)}
              rowKey="id"
              loading={loading}
              pagination={false}
              size="small"
              scroll={{ x: true }}
            />
          </Card>

          {/* Testnet Networks */}
          <Card title={t('network.testnetNetworks')} size="small">
            <Table
              columns={columns}
              dataSource={networks.filter(n => n.category === 'testnet' || n.isTestnet)}
              rowKey="id"
              loading={loading}
              pagination={false}
              size="small"
              scroll={{ x: true }}
            />
          </Card>

          {/* Custom Networks */}
          {networks.filter(n => !n.isDefault && !n.isMainnet && !n.isTestnet).length > 0 && (
            <Card title={t('network.customNetworks')} size="small">
              <Table
                columns={columns}
                dataSource={networks.filter(n => !n.isDefault && !n.isMainnet && !n.isTestnet)}
                rowKey="id"
                loading={loading}
                pagination={false}
                size="small"
                scroll={{ x: true }}
              />
            </Card>
          )}
        </Space>

        <Modal
          title={editingNetwork ? t('network.editNetwork') : t('network.addNetwork')}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width={380}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              name="name"
              label={t('network.networkName')}
              rules={[{ required: true, message: t('network.enterNetworkName') }]}
            >
              <Input placeholder={t('network.placeholderCustomNetwork')} />
            </Form.Item>

            <Form.Item
              name="chainId"
              label="Chain ID"
              rules={[
                { required: true, message: t('network.enterChainId') },
                { pattern: /^0x[0-9a-fA-F]+$/, message: t('network.validChainIdRequired') }
              ]}
            >
              <Input placeholder={t('network.placeholderChainId')} />
            </Form.Item>

            <Form.Item
              name="symbol"
              label={t('network.currencySymbol')}
              rules={[{ required: true, message: t('network.enterSymbol') }]}
            >
              <Input placeholder={t('network.placeholderSymbol')} />
            </Form.Item>

            <Form.Item
              name="rpcUrl"
              label="RPC URL"
              rules={[
                { required: true, message: t('network.enterRpcUrl') },
                { type: 'url', message: t('network.validUrlRequired') }
              ]}
            >
              <Input placeholder={t('network.placeholderRpcUrl')} />
            </Form.Item>

            <Form.Item
              name="blockExplorerUrl"
              label={t('network.blockExplorerUrlOptional')}
              rules={[
                { type: 'url', message: t('network.validUrlRequired') }
              ]}
            >
              <Input placeholder={t('network.placeholderExplorerUrl')} />
            </Form.Item>

            <Form.Item>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={() => setModalVisible(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="primary" htmlType="submit">
                  {editingNetwork ? t('common.update') : t('common.add')}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    );
  }

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
          {t('network.networkManagement')}
        </Title>
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={handleAddNetwork}
        >
          {t('common.add')}
        </Button>
      </Header>

      <Content style={{ padding: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* Mainnet Networks */}
          <Card title={t('network.mainnetNetworks')} size="small">
            <Table
              columns={columns}
              dataSource={networks.filter(n => n.category === 'mainnet' || n.isMainnet)}
              rowKey="id"
              loading={loading}
              pagination={false}
              size="small"
              scroll={{ x: true }}
            />
          </Card>

          {/* Testnet Networks */}
          <Card title={t('network.testnetNetworks')} size="small">
            <Table
              columns={columns}
              dataSource={networks.filter(n => n.category === 'testnet' || n.isTestnet)}
              rowKey="id"
              loading={loading}
              pagination={false}
              size="small"
              scroll={{ x: true }}
            />
          </Card>

          {/* Custom Networks */}
          {networks.filter(n => !n.isDefault && !n.isMainnet && !n.isTestnet).length > 0 && (
            <Card title={t('network.customNetworks')} size="small">
              <Table
                columns={columns}
                dataSource={networks.filter(n => !n.isDefault && !n.isMainnet && !n.isTestnet)}
                rowKey="id"
                loading={loading}
                pagination={false}
                size="small"
                scroll={{ x: true }}
              />
            </Card>
          )}
        </Space>

        <Modal
          title={editingNetwork ? t('network.editNetwork') : t('network.addNetwork')}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width={380}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              name="name"
              label={t('network.networkName')}
              rules={[{ required: true, message: t('network.enterNetworkName') }]}
            >
              <Input placeholder={t('network.placeholderCustomNetwork')} />
            </Form.Item>

            <Form.Item
              name="chainId"
              label="Chain ID"
              rules={[
                { required: true, message: t('network.enterChainId') },
                { pattern: /^0x[0-9a-fA-F]+$/, message: t('network.validChainIdRequired') }
              ]}
            >
              <Input placeholder={t('network.placeholderChainId')} />
            </Form.Item>

            <Form.Item
              name="symbol"
              label={t('network.currencySymbol')}
              rules={[{ required: true, message: t('network.enterSymbol') }]}
            >
              <Input placeholder={t('network.placeholderSymbol')} />
            </Form.Item>

            <Form.Item
              name="rpcUrl"
              label="RPC URL"
              rules={[
                { required: true, message: t('network.enterRpcUrl') },
                { type: 'url', message: t('network.validUrlRequired') }
              ]}
            >
              <Input placeholder={t('network.placeholderRpcUrl')} />
            </Form.Item>

            <Form.Item
              name="blockExplorerUrl"
              label={t('network.blockExplorerUrlOptional')}
              rules={[
                { type: 'url', message: t('network.validUrlRequired') }
              ]}
            >
              <Input placeholder={t('network.placeholderExplorerUrl')} />
            </Form.Item>

            <Form.Item>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={() => setModalVisible(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="primary" htmlType="submit">
                  {editingNetwork ? t('common.update') : t('common.add')}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
}