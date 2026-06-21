import { useEffect, useState } from 'react';
import {
  Card, Button, Typography, Space, Tag, Table, Input, Form,
  Modal, Drawer, Tabs, Popconfirm, message, Empty, Switch, Row, Col, Spin,
  List, Avatar,
} from 'antd';
import {
  PlusOutlined, TeamOutlined, DeleteOutlined, BookOutlined,
  FileTextOutlined, UserAddOutlined, CloseOutlined, PlayCircleOutlined,
  EditOutlined, SlidersFilled,
} from '@ant-design/icons';
import api from '../../api';

const { Title, Text, Paragraph } = Typography;

function toEmbedUrl(url) {
  if (!url) return '';
  try {
    const match = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) return url;
    return `https://docs.google.com/presentation/d/${match[1]}/embed?start=false&loop=false&delayms=3000`;
  } catch {
    return url;
  }
}

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupDetail, setGroupDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [allExams, setAllExams] = useState([]);
  const [examsForGroup, setExamsForGroup] = useState([]);
  const [addCodeInput, setAddCodeInput] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [form] = Form.useForm();

  // Aulas state
  const [aulas, setAulas] = useState([]);
  const [aulasLoading, setAulasLoading] = useState(false);
  const [aulaModalOpen, setAulaModalOpen] = useState(false);
  const [editingAula, setEditingAula] = useState(null);
  const [aulaPreview, setAulaPreview] = useState(null);
  const [aulaForm] = Form.useForm();

  async function fetchGroups() {
    try {
      const res = await api.get('/groups');
      setGroups(res.data);
    } catch { message.error('Erro ao carregar turmas'); }
    finally { setLoading(false); }
  }

  async function fetchExams() {
    try {
      const res = await api.get('/exams');
      setAllExams(res.data);
    } catch {}
  }

  useEffect(() => {
    fetchGroups();
    fetchExams();
  }, []);

  async function fetchAulas(groupId) {
    setAulasLoading(true);
    try {
      const res = await api.get(`/aulas/group/${groupId}`);
      setAulas(res.data);
    } catch { message.error('Erro ao carregar aulas'); }
    finally { setAulasLoading(false); }
  }

  async function openGroup(group) {
    setSelectedGroup(group);
    setDrawerOpen(true);
    setDetailLoading(true);
    try {
      const detailRes = await api.get(`/groups/${group.id}`);
      setGroupDetail(detailRes.data);
      const examsWithLinked = allExams.map(e => ({
        ...e,
        linked: detailRes.data.exams.some(ge => ge.examId === e.id),
      }));
      setExamsForGroup(examsWithLinked);
      await fetchAulas(group.id);
    } catch { message.error('Erro ao carregar turma'); }
    finally { setDetailLoading(false); }
  }

  async function createGroup({ name }) {
    try {
      await api.post('/groups', { name });
      message.success('Turma criada!');
      setCreateModalOpen(false);
      form.resetFields();
      fetchGroups();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao criar turma');
    }
  }

  async function deleteGroup(id) {
    try {
      await api.delete(`/groups/${id}`);
      message.success('Turma excluída');
      setDrawerOpen(false);
      fetchGroups();
    } catch { message.error('Erro ao excluir turma'); }
  }

  async function addMember() {
    if (!addCodeInput.trim()) return;
    setAddingMember(true);
    try {
      const res = await api.post(`/groups/${selectedGroup.id}/members`, { publicCode: addCodeInput.trim() });
      message.success(`${res.data.name} adicionado(a) à turma!`);
      setAddCodeInput('');
      const detailRes = await api.get(`/groups/${selectedGroup.id}`);
      setGroupDetail(detailRes.data);
      fetchGroups();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao adicionar aluno');
    } finally { setAddingMember(false); }
  }

  async function removeMember(memberId) {
    try {
      await api.delete(`/groups/${selectedGroup.id}/members/${memberId}`);
      message.success('Aluno removido');
      const detailRes = await api.get(`/groups/${selectedGroup.id}`);
      setGroupDetail(detailRes.data);
      fetchGroups();
    } catch { message.error('Erro ao remover aluno'); }
  }

  async function toggleExamLink(exam, linked) {
    try {
      if (linked) {
        await api.post(`/groups/${selectedGroup.id}/exams`, { examId: exam.id });
        message.success(`"${exam.title}" vinculada à turma`);
      } else {
        await api.delete(`/groups/${selectedGroup.id}/exams/${exam.id}`);
        message.success(`"${exam.title}" desvinculada`);
      }
      setExamsForGroup(prev => prev.map(e => e.id === exam.id ? { ...e, linked } : e));
      const detailRes = await api.get(`/groups/${selectedGroup.id}`);
      setGroupDetail(detailRes.data);
      fetchGroups();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao alterar vínculo');
    }
  }

  function openAddAula() {
    setEditingAula(null);
    aulaForm.resetFields();
    setAulaModalOpen(true);
  }

  function openEditAula(aula) {
    setEditingAula(aula);
    aulaForm.setFieldsValue({ title: aula.title, description: aula.description, slideUrl: aula.slideUrl });
    setAulaModalOpen(true);
  }

  async function saveAula(values) {
    try {
      if (editingAula) {
        await api.put(`/aulas/${editingAula.id}`, values);
        message.success('Aula atualizada!');
      } else {
        await api.post(`/aulas/group/${selectedGroup.id}`, values);
        message.success('Aula cadastrada!');
      }
      setAulaModalOpen(false);
      aulaForm.resetFields();
      fetchAulas(selectedGroup.id);
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar aula');
    }
  }

  async function deleteAula(aulaId) {
    try {
      await api.delete(`/aulas/${aulaId}`);
      message.success('Aula removida');
      fetchAulas(selectedGroup.id);
    } catch { message.error('Erro ao remover aula'); }
  }

  const memberColumns = [
    { title: 'Nome', dataIndex: 'name', key: 'name', render: (v) => <Text strong>{v}</Text> },
    { title: 'Email', dataIndex: 'email', key: 'email', render: (v) => <Text type="secondary">{v}</Text> },
    {
      title: '', key: 'action',
      render: (_, r) => (
        <Popconfirm title="Remover aluno da turma?" onConfirm={() => removeMember(r.memberId)} okText="Sim" cancelText="Não">
          <Button size="small" danger icon={<CloseOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const examColumns = [
    {
      title: 'Avaliação', key: 'title',
      render: (_, e) => (
        <Space>
          {e.type === 'TAREFA' ? <BookOutlined style={{ color: '#1677ff' }} /> : <FileTextOutlined />}
          <Text>{e.title}</Text>
          <Tag color={e.type === 'TAREFA' ? 'blue' : 'default'} style={{ fontSize: 11 }}>
            {e.type === 'TAREFA' ? 'Tarefa' : 'Prova'}
          </Tag>
          <Tag color={e.status === 'ACTIVE' ? 'success' : e.status === 'DRAFT' ? 'default' : 'error'} style={{ fontSize: 11 }}>
            {e.status === 'ACTIVE' ? 'Ativa' : e.status === 'DRAFT' ? 'Rascunho' : 'Encerrada'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Vinculada', key: 'linked',
      render: (_, e) => (
        <Switch
          checked={e.linked}
          checkedChildren="Sim"
          unCheckedChildren="Não"
          onChange={checked => toggleExamLink(e, checked)}
          disabled={e.status === 'CLOSED'}
        />
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Turmas</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
          Nova Turma
        </Button>
      </div>

      {loading ? <Spin /> : groups.length === 0 ? (
        <Card>
          <Empty
            image={<TeamOutlined style={{ fontSize: 48, color: '#bbb' }} />}
            description="Nenhuma turma criada ainda"
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
              Criar primeira turma
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {groups.map(g => (
            <Col xs={24} sm={12} md={8} key={g.id}>
              <Card
                hoverable
                onClick={() => openGroup(g)}
                actions={[
                  <Popconfirm
                    key="del"
                    title="Excluir turma? Todos os vínculos serão removidos."
                    onConfirm={e => { e.stopPropagation(); deleteGroup(g.id); }}
                    onClick={e => e.stopPropagation()}
                    okText="Excluir" cancelText="Cancelar"
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={e => e.stopPropagation()}>
                      Excluir
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <Card.Meta
                  avatar={<TeamOutlined style={{ fontSize: 32, color: '#1677ff' }} />}
                  title={<Text strong style={{ fontSize: 16 }}>{g.name}</Text>}
                  description={
                    <Space>
                      <Tag icon={<TeamOutlined />}>{g.memberCount} aluno(s)</Tag>
                      <Tag icon={<BookOutlined />}>{g.examCount} avaliação(ões)</Tag>
                    </Space>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Modal criar turma */}
      <Modal
        title="Nova Turma"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); form.resetFields(); }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={createGroup}>
          <Form.Item name="name" label="Nome da turma" rules={[{ required: true, message: 'Informe o nome' }]}>
            <Input placeholder="Ex: Turma A — 2025" size="large" />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">Criar Turma</Button>
            <Button onClick={() => { setCreateModalOpen(false); form.resetFields(); }}>Cancelar</Button>
          </Space>
        </Form>
      </Modal>

      {/* Modal adicionar/editar aula */}
      <Modal
        title={editingAula ? 'Editar Aula' : 'Nova Aula'}
        open={aulaModalOpen}
        onCancel={() => { setAulaModalOpen(false); aulaForm.resetFields(); }}
        footer={null}
        width={560}
      >
        <Form form={aulaForm} layout="vertical" onFinish={saveAula}>
          <Form.Item name="title" label="Título da aula" rules={[{ required: true, message: 'Informe o título' }]}>
            <Input placeholder="Ex: Introdução à Matemática" />
          </Form.Item>
          <Form.Item name="description" label="Descrição (opcional)">
            <Input.TextArea placeholder="Resumo do conteúdo da aula..." rows={2} />
          </Form.Item>
          <Form.Item
            name="slideUrl"
            label="Link do Google Slides"
            rules={[
              { required: true, message: 'Informe o link do Google Slides' },
              {
                validator: (_, value) => {
                  if (!value || value.includes('docs.google.com/presentation')) return Promise.resolve();
                  return Promise.reject('Informe um link válido do Google Slides');
                },
              },
            ]}
          >
            <Input placeholder="https://docs.google.com/presentation/d/..." />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">{editingAula ? 'Salvar' : 'Cadastrar Aula'}</Button>
            <Button onClick={() => { setAulaModalOpen(false); aulaForm.resetFields(); }}>Cancelar</Button>
          </Space>
        </Form>
      </Modal>

      {/* Modal prévia dos slides */}
      <Modal
        title={aulaPreview?.title}
        open={!!aulaPreview}
        onCancel={() => setAulaPreview(null)}
        footer={null}
        width={860}
        styles={{ body: { padding: 0 } }}
      >
        {aulaPreview && (
          <iframe
            src={toEmbedUrl(aulaPreview.slideUrl)}
            width="100%"
            height="480"
            frameBorder="0"
            allowFullScreen
            title={aulaPreview.title}
            style={{ display: 'block' }}
          />
        )}
      </Modal>

      {/* Drawer de detalhes */}
      <Drawer
        title={selectedGroup?.name}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={680}
      >
        {detailLoading ? <Spin style={{ display: 'block', marginTop: 40 }} /> : groupDetail && (
          <Tabs
            items={[
              {
                key: 'members',
                label: <Space><TeamOutlined />Alunos ({groupDetail.members.length})</Space>,
                children: (
                  <div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                      <Input
                        value={addCodeInput}
                        onChange={e => setAddCodeInput(e.target.value.toUpperCase())}
                        onPressEnter={addMember}
                        placeholder="Código público do aluno (8 caracteres)"
                        maxLength={8}
                        style={{ flex: 1, letterSpacing: 2, fontWeight: 600 }}
                      />
                      <Button
                        type="primary"
                        icon={<UserAddOutlined />}
                        loading={addingMember}
                        onClick={addMember}
                      >
                        Adicionar
                      </Button>
                    </div>
                    <Table
                      dataSource={groupDetail.members}
                      rowKey="memberId"
                      columns={memberColumns}
                      size="small"
                      pagination={false}
                      locale={{ emptyText: <Empty description="Nenhum aluno nesta turma ainda" /> }}
                    />
                  </div>
                ),
              },
              {
                key: 'exams',
                label: <Space><BookOutlined />Avaliações ({groupDetail.exams.length})</Space>,
                children: (
                  <Table
                    dataSource={examsForGroup}
                    rowKey="id"
                    columns={examColumns}
                    size="small"
                    pagination={false}
                    locale={{ emptyText: <Empty description="Nenhuma avaliação cadastrada" /> }}
                  />
                ),
              },
              {
                key: 'aulas',
                label: <Space><SlidersFilled />Aulas ({aulas.length})</Space>,
                children: (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                      <Button type="primary" icon={<PlusOutlined />} onClick={openAddAula}>
                        Nova Aula
                      </Button>
                    </div>
                    {aulasLoading ? <Spin /> : aulas.length === 0 ? (
                      <Empty description="Nenhuma aula cadastrada ainda">
                        <Button icon={<PlusOutlined />} onClick={openAddAula}>Adicionar primeira aula</Button>
                      </Empty>
                    ) : (
                      <List
                        dataSource={aulas}
                        rowKey="id"
                        renderItem={(aula, idx) => (
                          <List.Item
                            actions={[
                              <Button
                                key="preview"
                                size="small"
                                icon={<PlayCircleOutlined />}
                                onClick={() => setAulaPreview(aula)}
                              >
                                Prévia
                              </Button>,
                              <Button
                                key="edit"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => openEditAula(aula)}
                              />,
                              <Popconfirm
                                key="del"
                                title="Remover esta aula?"
                                onConfirm={() => deleteAula(aula.id)}
                                okText="Remover" cancelText="Cancelar"
                              >
                                <Button size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>,
                            ]}
                          >
                            <List.Item.Meta
                              avatar={
                                <Avatar style={{ background: '#1677ff', fontWeight: 700 }}>
                                  {idx + 1}
                                </Avatar>
                              }
                              title={<Text strong>{aula.title}</Text>}
                              description={aula.description || <Text type="secondary" style={{ fontSize: 12 }}>Sem descrição</Text>}
                            />
                          </List.Item>
                        )}
                      />
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Drawer>
    </>
  );
}
