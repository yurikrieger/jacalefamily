import React, { useState, useEffect } from 'react';
// Importação dos ícones utilizados na interface do sistema
import { Users, FileSpreadsheet, Check, Save, Download, ClipboardList, UserCheck, Trash2, UserPlus, AlertCircle, Lock, Unlock, LogOut, LogIn, Mail, Key, Edit3, Clock, AlertTriangle, UploadCloud, Hash, Pencil, Calendar, Layers, BookOpen, Search, Camera, User, Menu, X } from 'lucide-react';
// Biblioteca para leitura e geração de arquivos Excel/CSV
import * as XLSX from 'xlsx';

import galtLogo from './assets/galt-logo.png';

// ============================================================================
// CONFIGURAÇÃO DO FIREBASE (BANCO DE DADOS NA NUVEM)
// ============================================================================
// Inicialização da comunicação com os servidores do Google Firebase.
import { initializeApp } from 'firebase/app';
// IMPORTAÇÃO NOVA: Adicionada a função 'sendPasswordResetEmail' para enviar o link de recuperação de senha
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, query, where, getDocs, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAlgGs-tNsli9z0zSNDi-XrgNIrd_KavdE",
  authDomain: "galt-7c6ff.firebaseapp.com",
  projectId: "galt-7c6ff",
  storageBucket: "galt-7c6ff.firebasestorage.app",
  messagingSenderId: "264752802100",
  appId: "1:264752802100:web:cbccb1b3514c6c179d9d61"
};

// Instanciando os serviços do Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ID identificador principal do aplicativo no banco
const appId = 'sistema-frequencia'; 

// Lista padrão de disciplinas injetadas caso o banco de dados esteja vazio
const DISCIPLINAS_PADRAO = [
  'Artes', 'Biologia', 'Espanhol', 'Filosofia', 'Física', 'Geografia física', 
  'Geografia política', 'Gramática', 'História', 'Inglês', 'Literatura', 
  'Matemática', 'Química', 'Redação', 'Sociologia'
];

// Dados de exemplo para popular o sistema para testes rápidos
const ALUNOS_EXEMPLO = [
  { nome: 'Ana Silva', turma: 'Turma A', matricula: '2026001', ativo: true },
  { nome: 'Bruno Costa', turma: 'Turma A', matricula: '2026002', ativo: true },
  { nome: 'Carlos Souza', turma: 'Turma A', matricula: '2026003', ativo: true },
  { nome: 'Daniela Oliveira', turma: 'Turma B', matricula: '2026004', ativo: true },
  { nome: 'Eduardo Santos', turma: 'Turma B', matricula: '2026005', ativo: true },
];

export default function App() {
  // ============================================================================
  // ESTADOS GERAIS E AUTENTICAÇÃO
  // ============================================================================
  // Gerenciamento de login e controle de qual aba o usuário está visualizando
  const [user, setUser] = useState(null); 
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); 
  const [activeTab, setActiveTab] = useState('frequencia'); 
  
  // Controle do menu responsivo para dispositivos móveis
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Estados para capturar dados do formulário de login
  const [emailLogin, setEmailLogin] = useState('');
  const [senhaLogin, setSenhaLogin] = useState('');
  const [erroLogin, setErroLogin] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // ============================================================================
  // ESTADOS E FUNÇÃO DE RECUPERAÇÃO DE SENHA (NOVO BLOCO)
  // ============================================================================
  // Estado que controla a exibição da interface: false (exibe Login) | true (exibe Recuperação)
  const [showResetPassword, setShowResetPassword] = useState(false);
  // Estado para armazenar mensagens de feedback (sucesso ou erro) ao enviar o email de reset
  const [mensagemRecuperacao, setMensagemRecuperacao] = useState('');
  // Estado de loading para desativar o botão enquanto o Firebase processa o envio
  const [isSendingReset, setIsSendingReset] = useState(false);

  // Função assíncrona que interage com a API do Firebase para disparar o e-mail de redefinição
  const handleRecuperarSenha = async (e) => {
    e.preventDefault(); // Previne o comportamento padrão do formulário de recarregar a página
    
    // Validação inicial para garantir que o usuário digitou um email válido
    if (!emailLogin) {
      setMensagemRecuperacao('Por favor, digite seu e-mail acima primeiro.');
      return;
    }
    
    setIsSendingReset(true);
    setMensagemRecuperacao('');
    
    try {
      // Chama o método nativo do Firebase Auth passando a instância de autenticação e o e-mail informado
      await sendPasswordResetEmail(auth, emailLogin);
      // Mensagem de sucesso em caso de disparo positivo
      setMensagemRecuperacao('✅ E-mail de recuperação enviado! Verifique sua caixa de entrada (e a pasta de spam).');
    } catch (error) {
      // Captura erros como: e-mail não cadastrado na plataforma ou erro de digitação
      console.error("Erro ao recuperar senha:", error);
      setMensagemRecuperacao('❌ Erro ao enviar. Verifique se o e-mail foi digitado corretamente.');
    } finally {
      // Libera o botão novamente independente de erro ou sucesso
      setIsSendingReset(false);
    }
  };
  
  // ============================================================================
  // ESTADOS DA APLICAÇÃO (ALUNOS, TURMAS E DISCIPLINAS)
  // ============================================================================
  // Arrays que guardam os dados puxados do Firebase
  const [alunos, setAlunos] = useState([]); 
  const [turmas, setTurmas] = useState([]); 
  const [disciplinas, setDisciplinas] = useState([]);

  // Estados para os campos de adição de um novo aluno manual
  const [novoAlunoNome, setNovoAlunoNome] = useState(''); 
  const [novoAlunoTurma, setNovoAlunoTurma] = useState(''); 
  const [novoAlunoMatricula, setNovoAlunoMatricula] = useState(''); 
  const [isAddingAluno, setIsAddingAluno] = useState(false); 
  const [alunoParaRemover, setAlunoParaRemover] = useState(null); 

  // Estados que controlam a edição dos dados de um aluno já existente
  const [alunoParaEditar, setAlunoParaEditar] = useState(null);
  const [editAlunoNome, setEditAlunoNome] = useState('');
  const [editAlunoTurma, setEditAlunoTurma] = useState('');
  const [editAlunoMatricula, setEditAlunoMatricula] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Controle dos modais de criação rápida de turmas e disciplinas
  const [showModalNovaTurma, setShowModalNovaTurma] = useState(false);
  const [nomeNovaTurma, setNomeNovaTurma] = useState('');
  const [isSavingTurma, setIsSavingTurma] = useState(false);

  const [showModalNovaDisciplina, setShowModalNovaDisciplina] = useState(false);
  const [nomeNovaDisciplina, setNomeNovaDisciplina] = useState('');
  const [isSavingDisciplina, setIsSavingDisciplina] = useState(false);

  // Filtros de busca na lista de alunos
  const [filtroTurmaAlunos, setFiltroTurmaAlunos] = useState('Todas'); 
  const [buscaAlunoLista, setBuscaAlunoLista] = useState('');
  
  // Controle de status e erros durante a importação de planilhas
  const [isImporting, setIsImporting] = useState(false);
  const [mensagemImportacao, setMensagemImportacao] = useState('');
  const [showModalErro, setShowModalErro] = useState(false);
  const [detalhesErro, setDetalhesErro] = useState('');

  // ============================================================================
  // ESTADOS DE RELATÓRIOS (GERAL E DO PROFESSOR)
  // ============================================================================
  // Registros gerais (Coordenação) e registros apenas do professor logado
  const [registros, setRegistros] = useState([]); 
  const [meusRegistros, setMeusRegistros] = useState([]); 
  const [isLoadingDados, setIsLoadingDados] = useState(true);
  const [isLoadingMeusDados, setIsLoadingMeusDados] = useState(true);
  
  // Controle de segurança da área de coordenação
  const [isDadosUnlocked, setIsDadosUnlocked] = useState(false);
  const [senhaDigitada, setSenhaDigitada] = useState(''); 
  const [erroSenha, setErroSenha] = useState(false); 
  const [isVerifyingSenha, setIsVerifyingSenha] = useState(false);

  // ============================================================================
  // ESTADOS DO PERFIL DO PROFESSOR
  // ============================================================================
  const [perfilUsuario, setPerfilUsuario] = useState({ nome: '', foto: '' });
  const [isSavingPerfil, setIsSavingPerfil] = useState(false);

  // ============================================================================
  // ESTADOS - ÁREA DE FREQUÊNCIA (CHAMADA INTELIGENTE)
  // ============================================================================
  // Guarda as opções selecionadas para a chamada atual
  const [dataChamada, setDataChamada] = useState(new Date().toISOString().split('T')[0]);
  const [turmaSelecionada, setTurmaSelecionada] = useState('');
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState(''); 
  
  // Objeto dinâmico que mapeia o status (P/F/J) para cada ID de aluno
  const [presencas, setPresencas] = useState({}); 
  
  const [isSavingChamada, setIsSavingChamada] = useState(false);
  const [mensagemFeedback, setMensagemFeedback] = useState('');
  
  // Variáveis para controlar o modo de edição (se a chamada do dia já existe)
  const [registroAtualId, setRegistroAtualId] = useState(null);
  const [registroCriadoEm, setRegistroCriadoEm] = useState(null); 
  const [showModalEdicao, setShowModalEdicao] = useState(false);  

  // ============================================================================
  // EFEITOS (USE_EFFECTS) - BUSCAS NO BANCO DE DADOS E LISTENERS
  // ============================================================================
  
  // Observer para monitorar mudanças de login/logout
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Busca as informações do perfil do usuário assim que ele loga
  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setPerfilUsuario(docSnap.data());
      } else {
        setPerfilUsuario({ nome: user.email.split('@')[0], foto: '' });
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Carrega a lista de turmas em tempo real. Se vazio, cria as turmas padrão.
  useEffect(() => {
    if (!user) return;
    const turmasRef = collection(db, 'artifacts', appId, 'public', 'data', 'turmas');
    
    const unsubscribe = onSnapshot(turmasRef, (snapshot) => {
      if (snapshot.empty) {
        const criarTurmasIniciais = async () => {
          const defaults = ['Turma A', 'Turma B', 'Turma C', 'Turma D'];
          for (const t of defaults) {
            await addDoc(turmasRef, { nome: t });
          }
        };
        criarTurmasIniciais();
      } else {
        const listaTurmas = [];
        snapshot.forEach(doc => listaTurmas.push(doc.data().nome));
        
        // Remove duplicidades e ordena alfabeticamente
        const turmasUnicas = [...new Set(listaTurmas)]; 
        turmasUnicas.sort((a, b) => a.localeCompare(b)); 
        
        setTurmas(turmasUnicas);
        setTurmaSelecionada(prev => prev || turmasUnicas[0]);
        setNovoAlunoTurma(prev => prev || turmasUnicas[0]);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Carrega a lista de disciplinas. Se vazio, popula com a base de dados padrão.
  useEffect(() => {
    if (!user) return;
    const disciplinasRef = collection(db, 'artifacts', appId, 'public', 'data', 'disciplinas');
    
    const unsubscribe = onSnapshot(disciplinasRef, (snapshot) => {
      if (snapshot.empty) {
        const criarDisciplinasIniciais = async () => {
          for (const d of DISCIPLINAS_PADRAO) {
            await addDoc(disciplinasRef, { nome: d });
          }
        };
        criarDisciplinasIniciais();
      } else {
        const listaDisciplinas = [];
        snapshot.forEach(doc => listaDisciplinas.push(doc.data().nome));
        
        const disciplinasUnicas = [...new Set(listaDisciplinas)]; 
        disciplinasUnicas.sort((a, b) => a.localeCompare(b)); 
        
        setDisciplinas(disciplinasUnicas);
        setDisciplinaSelecionada(prev => prev || disciplinasUnicas[0]);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Ouve atualizações nos dados dos alunos para refletir na interface
  useEffect(() => {
    if (!user) return;
    const alunosRef = collection(db, 'artifacts', appId, 'public', 'data', 'alunos');
    const unsubscribe = onSnapshot(alunosRef, (snapshot) => {
      const listaAlunos = [];
      snapshot.forEach(doc => listaAlunos.push({ id: doc.id, ...doc.data() }));
      listaAlunos.sort((a, b) => a.nome.localeCompare(b.nome)); 
      setAlunos(listaAlunos);
    });
    return () => unsubscribe();
  }, [user]);

  // Consulta as chamadas globais APENAS se a área de relatórios foi desbloqueada pela senha
  useEffect(() => {
    if (!user || activeTab !== 'relatorios' || !isDadosUnlocked) return;
    setIsLoadingDados(true);
    const frequenciaRef = collection(db, 'artifacts', appId, 'public', 'data', 'frequenciaEscolar');
    
    const unsubscribe = onSnapshot(frequenciaRef, (snapshot) => {
        const dadosBuscados = [];
        snapshot.forEach((doc) => dadosBuscados.push({ id: doc.id, ...doc.data() }));
        dadosBuscados.sort((a, b) => new Date(b.data) - new Date(a.data)); 
        setRegistros(dadosBuscados);
        setIsLoadingDados(false);
      },
      (error) => {
        console.error("Erro ao buscar dados:", error);
        setIsLoadingDados(false);
      }
    );
    return () => unsubscribe();
  }, [user, activeTab, isDadosUnlocked]); 

  // Consulta apenas as chamadas do professor logado
  useEffect(() => {
    if (!user || activeTab !== 'perfil') return;
    setIsLoadingMeusDados(true);
    const frequenciaRef = collection(db, 'artifacts', appId, 'public', 'data', 'frequenciaEscolar');
    const q = query(frequenciaRef, where('criadoPor', '==', user.email));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const dadosBuscados = [];
        snapshot.forEach((doc) => dadosBuscados.push({ id: doc.id, ...doc.data() }));
        dadosBuscados.sort((a, b) => new Date(b.data) - new Date(a.data)); 
        setMeusRegistros(dadosBuscados);
        setIsLoadingMeusDados(false);
      },
      (error) => {
        console.error("Erro ao buscar dados do professor:", error);
        setIsLoadingMeusDados(false);
      }
    );
    return () => unsubscribe();
  }, [user, activeTab]); 

  // Verifica continuamente se a Data + Turma + Disciplina informadas já têm uma chamada salva
  useEffect(() => {
    if (!user || !turmaSelecionada || !disciplinaSelecionada) return;

    const verificarChamadaExistente = async () => {
      try {
        const q = query(
          collection(db, 'artifacts', appId, 'public', 'data', 'frequenciaEscolar'),
          where('data', '==', dataChamada),
          where('turma', '==', turmaSelecionada),
          where('disciplina', '==', disciplinaSelecionada) 
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const chamadaEncontrada = querySnapshot.docs[0];
          setRegistroAtualId(chamadaEncontrada.id); 
          const dados = chamadaEncontrada.data();
          setRegistroCriadoEm(dados.criadoEm); 
          
          // Reconstrói o estado das presenças a partir do banco de dados para habilitar a edição
          const presencasAnteriores = {};
          dados.detalhes.forEach(aluno => {
            let statusRecuperado = aluno.status || 'I';
            if (statusRecuperado === 'P') statusRecuperado = 'I';

            presencasAnteriores[aluno.alunoId] = {
              status: statusRecuperado,
              observacao: aluno.observacao || ''
            };
          });
          setPresencas(presencasAnteriores);
        } else {
          // Limpa o estado se for uma chamada nova e virgem
          setRegistroAtualId(null);
          setRegistroCriadoEm(null);
          setPresencas({}); 
        }
      } catch (error) {
        console.error("Erro ao verificar chamada existente:", error);
      }
    };
    verificarChamadaExistente();
  }, [dataChamada, turmaSelecionada, disciplinaSelecionada, user]); 

  // Regra de negócio: impede edições em chamadas que foram salvas há mais de 24 horas
  const isEditExpired = registroCriadoEm 
    ? (new Date() - new Date(registroCriadoEm)) > 24 * 60 * 60 * 1000 
    : false;

  // Filtra alunos que não estão deletados (ativos)
  const alunosAtivos = alunos.filter(aluno => aluno.ativo !== false);

  // ============================================================================
  // FUNÇÕES DE AUTENTICAÇÃO E PERFIL
  // ============================================================================
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setErroLogin('');
    try {
      await signInWithEmailAndPassword(auth, emailLogin, senhaLogin);
    } catch (error) {
      console.error(error);
      setErroLogin('E-mail ou senha incorretos. Verifique suas credenciais.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setIsDadosUnlocked(false);
  };

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPerfilUsuario(prev => ({ ...prev, foto: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSalvarPerfil = async (e) => {
    e.preventDefault();
    setIsSavingPerfil(true);
    try {
      const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', user.uid);
      await setDoc(userDocRef, { 
        nome: perfilUsuario.nome, 
        foto: perfilUsuario.foto 
      }, { merge: true });
      
      setMensagemFeedback('Perfil atualizado com sucesso!');
      setTimeout(() => setMensagemFeedback(''), 3000);
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
    } finally {
      setIsSavingPerfil(false);
    }
  };

  const handleRemoverFoto = () => {
    setPerfilUsuario(prev => ({ ...prev, foto: '' }));
  };

  const trocarAba = (novaAba) => {
    setActiveTab(novaAba);
    setIsMobileMenuOpen(false);
  };

  // ============================================================================
  // FUNÇÕES AUXILIARES DE INTERFACE (CORES)
  // ============================================================================
  // Aplica um hash sobre o nome da turma para garantir que ela tenha sempre a mesma cor na UI
  const obterCorDaTurma = (nomeDaTurma) => {
    const paletaDeCores = [
      'bg-blue-100 text-blue-700 border-blue-200',
      'bg-emerald-100 text-emerald-700 border-emerald-200',
      'bg-purple-100 text-purple-700 border-purple-200',
      'bg-amber-100 text-amber-700 border-amber-200',
      'bg-pink-100 text-pink-700 border-pink-200',
      'bg-cyan-100 text-cyan-700 border-cyan-200',
      'bg-indigo-100 text-indigo-700 border-indigo-200',
      'bg-rose-100 text-rose-700 border-rose-200'
    ];
    
    let hash = 0;
    for (let i = 0; i < nomeDaTurma.length; i++) {
      hash = nomeDaTurma.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const indice = Math.abs(hash) % paletaDeCores.length;
    return paletaDeCores[indice];
  };

  // ============================================================================
  // FUNÇÕES DE CRIAÇÃO E GESTÃO DE ALUNOS
  // ============================================================================
  
  const handleCriarNovaTurma = async (e) => {
    e.preventDefault();
    let nomeFinal = nomeNovaTurma.trim();
    if (!nomeFinal) return;

    nomeFinal = nomeFinal.replace(/^sala\s+/i, '');

    if (!/^Turma\s+/i.test(nomeFinal)) {
      nomeFinal = "Turma " + nomeFinal;
    }
    
    nomeFinal = "Turma " + nomeFinal.replace(/^Turma\s+/i, '').toUpperCase();

    if (turmas.includes(nomeFinal)) {
      setDetalhesErro(`A "${nomeFinal}" já está cadastrada no sistema.`);
      setShowModalErro(true);
      return;
    }

    setIsSavingTurma(true);
    try {
      const turmasRef = collection(db, 'artifacts', appId, 'public', 'data', 'turmas');
      await addDoc(turmasRef, { nome: nomeFinal });
      setNomeNovaTurma('');
      setShowModalNovaTurma(false);
    } catch (error) {
      console.error("Erro ao criar turma:", error);
    } finally {
      setIsSavingTurma(false);
    }
  };

  const handleCriarNovaDisciplina = async (e) => {
    e.preventDefault();
    let nomeFinal = nomeNovaDisciplina.trim();
    if (!nomeFinal) return;

    nomeFinal = nomeFinal.charAt(0).toUpperCase() + nomeFinal.slice(1);

    if (disciplinas.includes(nomeFinal)) {
      setDetalhesErro(`A disciplina "${nomeFinal}" já está cadastrada no sistema.`);
      setShowModalErro(true);
      return;
    }

    setIsSavingDisciplina(true);
    try {
      const disciplinasRef = collection(db, 'artifacts', appId, 'public', 'data', 'disciplinas');
      await addDoc(disciplinasRef, { nome: nomeFinal });
      setNomeNovaDisciplina('');
      setShowModalNovaDisciplina(false);
    } catch (error) {
      console.error("Erro ao criar disciplina:", error);
    } finally {
      setIsSavingDisciplina(false);
    }
  };

  const handleAdicionarAluno = async (e) => {
    e.preventDefault(); 
    if (!novoAlunoNome.trim() || !user || !novoAlunoTurma) return; 

    // Verificação de segurança para evitar duplicidade de matrículas
    const matriculaLimpa = novoAlunoMatricula.trim();
    if (matriculaLimpa && matriculaLimpa !== 'N/A') {
      const alunoExistente = alunosAtivos.find(a => a.matricula === matriculaLimpa);
      if (alunoExistente) {
        setDetalhesErro(`O número de matrícula "${matriculaLimpa}" já está sendo usado pelo(a) aluno(a) ${alunoExistente.nome} da ${alunoExistente.turma}. As matrículas no sistema devem ser exclusivas para cada estudante.`);
        setShowModalErro(true);
        return; 
      }
    }

    setIsAddingAluno(true); 
    try {
      const alunosRef = collection(db, 'artifacts', appId, 'public', 'data', 'alunos');
      await addDoc(alunosRef, { 
        nome: novoAlunoNome.trim().toUpperCase(), 
        turma: novoAlunoTurma,
        matricula: matriculaLimpa || 'N/A', 
        ativo: true
      });
      setNovoAlunoNome(''); 
      setNovoAlunoMatricula('');
    } catch (error) {
      console.error("Erro ao adicionar aluno:", error);
    } finally {
      setIsAddingAluno(false); 
    }
  };

  const abrirModalEdicaoAluno = (aluno) => {
    setAlunoParaEditar(aluno);
    setEditAlunoNome(aluno.nome);
    setEditAlunoTurma(aluno.turma);
    setEditAlunoMatricula(aluno.matricula === 'N/A' ? '' : aluno.matricula);
  };

  const handleSalvarEdicaoAluno = async (e) => {
    e.preventDefault();
    if (!editAlunoNome.trim() || !alunoParaEditar || !editAlunoTurma) return;
    
    const matriculaLimpa = editAlunoMatricula.trim();
    if (matriculaLimpa && matriculaLimpa !== 'N/A') {
      const alunoExistente = alunosAtivos.find(a => a.matricula === matriculaLimpa && a.id !== alunoParaEditar.id);
      if (alunoExistente) {
        setDetalhesErro(`Não é possível transferir a matrícula "${matriculaLimpa}" para este aluno, pois ela já está registrada para ${alunoExistente.nome} da ${alunoExistente.turma}.`);
        setShowModalErro(true);
        return; 
      }
    }

    setIsSavingEdit(true);
    try {
      const alunoRef = doc(db, 'artifacts', appId, 'public', 'data', 'alunos', alunoParaEditar.id);
      await updateDoc(alunoRef, {
        nome: editAlunoNome.trim().toUpperCase(),
        turma: editAlunoTurma,
        matricula: matriculaLimpa || 'N/A'
      });
      setAlunoParaEditar(null); 
    } catch (error) {
      console.error("Erro ao editar aluno:", error);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleImportarPlanilha = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    setMensagemImportacao('Analisando arquivo...');

    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const primeiraAba = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[primeiraAba];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        let padraoIncorreto = false;
        let erroMensagem = '';
        const matriculasNaPlanilha = new Map(); 

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          const turmaLida = row.Turma || row.turma;
          const matriculaLida = String(row.Matricula || row.matricula || row.Matrícula || row.matrícula || '').trim();
          const nomeLido = row.Nome || row.nome;
          
          if (!turmaLida || !turmas.includes(String(turmaLida).trim())) {
            padraoIncorreto = true;
            erroMensagem = `Na linha ${i + 2} do Excel, a coluna turma contém o valor "${turmaLida || 'Vazio'}". O sistema exige padronização. Utilize exatamente o nome das turmas cadastradas: ${turmas.join(', ')}.`;
            break;
          }

          if (matriculaLida && matriculaLida !== 'N/A') {
            const alunoNoBanco = alunosAtivos.find(a => a.matricula === matriculaLida);
            if (alunoNoBanco) {
              padraoIncorreto = true;
              erroMensagem = `Conflito detectado na linha ${i + 2} do Excel: A matrícula "${matriculaLida}" já pertence ao aluno(a) ${alunoNoBanco.nome} no banco de dados.`;
              break;
            }

            if (matriculasNaPlanilha.has(matriculaLida)) {
              padraoIncorreto = true;
              const { linha: linhaAnterior, nome: nomeAnterior } = matriculasNaPlanilha.get(matriculaLida);
              erroMensagem = `Duplicidade detectada DENTRO da planilha: A linha ${linhaAnterior} (${nomeAnterior}) e a linha ${i + 2} possuem a mesma matrícula "${matriculaLida}".`;
              break;
            } else {
              matriculasNaPlanilha.set(matriculaLida, { linha: i + 2, nome: nomeLido });
            }
          }
        }

        if (padraoIncorreto) {
          setDetalhesErro(erroMensagem);
          setShowModalErro(true);
          setIsImporting(false);
          setMensagemImportacao('');
          e.target.value = null; 
          return; 
        }

        let alunosAdicionados = 0;
        const alunosRef = collection(db, 'artifacts', appId, 'public', 'data', 'alunos');
        setMensagemImportacao('Planilha Validada! Salvando na nuvem...');

        for (const row of jsonData) {
          const nomeAluno = row.Nome || row.nome;
          const turmaAluno = row.Turma || row.turma;
          const matriculaAluno = row.Matricula || row.matricula || row.Matrícula || row.matrícula;

          if (nomeAluno && turmaAluno) {
            await addDoc(alunosRef, {
              nome: String(nomeAluno).trim().toUpperCase(),
              turma: String(turmaAluno).trim(), 
              matricula: matriculaAluno ? String(matriculaAluno).trim() : 'N/A', 
              ativo: true
            });
            alunosAdicionados++;
          }
        }

        setMensagemImportacao(`${alunosAdicionados} alunos importados com sucesso!`);
      } catch (error) {
        console.error("Erro na importação:", error);
        setMensagemImportacao('Erro ao ler a planilha. Verifique as colunas (Nome, Turma, Matricula).');
      } finally {
        setIsImporting(false);
        setTimeout(() => setMensagemImportacao(''), 5000);
        e.target.value = null; 
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleConfirmarRemocao = async () => {
    if (!alunoParaRemover) return; 
    try {
      const alunoRef = doc(db, 'artifacts', appId, 'public', 'data', 'alunos', alunoParaRemover.id);
      await updateDoc(alunoRef, { ativo: false }); 
      setAlunoParaRemover(null); 
    } catch (error) {
      console.error("Erro ao inativar aluno:", error);
    }
  };

  const popularComDadosDeExemplo = async () => {
    const alunosRef = collection(db, 'artifacts', appId, 'public', 'data', 'alunos');
    for (const aluno of ALUNOS_EXEMPLO) {
      await addDoc(alunosRef, { 
        nome: aluno.nome.toUpperCase(), 
        turma: aluno.turma, 
        matricula: aluno.matricula,
        ativo: true 
      });
    }
  };

  // ============================================================================
  // FUNÇÕES DA CHAMADA
  // ============================================================================
  
  // Atualiza dinamicamente o status ou as observações do aluno na memória
  const handleAlterarDadosAluno = (alunoId, campo, valor) => {
    if (isEditExpired) return; 
    setPresencas(prev => ({ 
      ...prev, 
      [alunoId]: { 
        ...prev[alunoId], 
        status: prev[alunoId]?.status || 'I', 
        observacao: prev[alunoId]?.observacao || '', 
        [campo]: valor 
      } 
    }));
  };

  // Interceptador para validar se deve abrir um aviso antes de sobrescrever uma chamada
  const handleCliqueSalvarOuAtualizar = () => {
    if (registroAtualId) {
      setShowModalEdicao(true); 
    } else {
      executarSalvamento(); 
    }
  };

  // Processo de submissão do documento de chamada para o banco de dados
  const executarSalvamento = async () => {
    if (!user || !turmaSelecionada || !disciplinaSelecionada) return;
    setIsSavingChamada(true);
    
    const alunosDaTurma = alunosAtivos.filter(a => a.turma === turmaSelecionada);
    
    // Constrói o array com o status final de cada aluno na hora do clique
    const detalhesAtualizados = alunosDaTurma.map(aluno => {
      const dadosAluno = presencas[aluno.id] || { status: 'I', observacao: '' }; 
      return {
        alunoId: aluno.id,
        nome: aluno.nome,
        matricula: aluno.matricula || 'N/A', 
        status: dadosAluno.status,
        observacao: dadosAluno.observacao
      };
    });

    try {
      if (registroAtualId) {
        // Se já existir, atualiza o documento existente e gera um log de alteração
        const documentoRef = doc(db, 'artifacts', appId, 'public', 'data', 'frequenciaEscolar', registroAtualId);
        await updateDoc(documentoRef, {
          detalhes: detalhesAtualizados,
          modificadoEm: new Date().toISOString(), 
          modificadoPor: user.email             
        });
        setMensagemFeedback('Chamada atualizada com sucesso!');
      } else {
        // Se for novo, injeta a disciplina, data, turma e gera um novo documento
        const dadosNovosParaSalvar = {
          data: dataChamada,
          turma: turmaSelecionada,
          disciplina: disciplinaSelecionada, 
          criadoEm: new Date().toISOString(), 
          criadoPor: user.email,
          detalhes: detalhesAtualizados
        };
        const colecaoRef = collection(db, 'artifacts', appId, 'public', 'data', 'frequenciaEscolar');
        const docRef = await addDoc(colecaoRef, dadosNovosParaSalvar);
        setRegistroAtualId(docRef.id); 
        setRegistroCriadoEm(dadosNovosParaSalvar.criadoEm);
        setMensagemFeedback('Nova chamada salva com sucesso!');
      }
      setShowModalEdicao(false); 
      setTimeout(() => setMensagemFeedback(''), 3000);
    } catch (error) {
      console.error("Erro ao salvar:", error);
    } finally {
      setIsSavingChamada(false); 
    }
  };

  // ============================================================================
  // FUNÇÕES DE RELATÓRIOS E EXPORTAÇÕES (CSV LOCAL)
  // ============================================================================
  
  // Converte a sigla salva no banco para a palavra completa no Excel
  const traduzirStatus = (status) => {
    const mapa = {
      'I': 'Integral',
      'M': 'Meio',
      'P': 'Integral', 
      'F': 'Falta',
      'J': 'Justificado'
    };
    return mapa[status] || status;
  };

  // Método base que recebe os dados, constrói as strings separadas por ponto e vírgula, e força o download
  const executarDownloadCSV = (listaRegistros, nomeArquivo) => {
    if (listaRegistros.length === 0) return;
    // Cabeçalho do arquivo
    let csvContent = "Data;Turma;Disciplina;Matricula;Aluno;Status da Frequencia;Observacoes\n";
    
    listaRegistros.forEach(registro => {
      registro.detalhes.forEach(aluno => {
        const dataFormatada = registro.data.split('-').reverse().join('/');
        const statusExtenso = traduzirStatus(aluno.status); 
        csvContent += `${dataFormatada};"${registro.turma}";"${registro.disciplina || 'N/A'}";"${aluno.matricula}";"${aluno.nome}";"${statusExtenso}";"${aluno.observacao || ''}"\n`;
      });
    });
    
    // Geração do Blob e download no browser local
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); 
    const link = document.createElement("a"); 
    link.setAttribute("href", url); 
    link.setAttribute("download", nomeArquivo); 
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link); 
  };

  // Isola os registros apenas no período de Domingo (0) até Sábado (6) antes de chamar o download base
  const executarDownloadSemanalCSV = (listaRegistros, prefixoNome) => {
    if (listaRegistros.length === 0) return;

    // Função auxiliar para padronizar data em yyyy-mm-dd
    const formataDataLocal = (dataObj) => {
      const ano = dataObj.getFullYear();
      const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
      const dia = String(dataObj.getDate()).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    };

    const hoje = new Date();
    const diaDaSemana = hoje.getDay(); // 0 é Domingo, 6 é Sábado
    
    // Volta os dias necessários para cair no exato domingo correspondente a hoje
    const domingo = new Date(hoje);
    domingo.setDate(hoje.getDate() - diaDaSemana);
    
    // Soma 6 dias no domingo encontrado para fechar a semana de análise no sábado
    const sabado = new Date(domingo);
    sabado.setDate(domingo.getDate() + 6);

    const dataInicio = formataDataLocal(domingo);
    const dataFim = formataDataLocal(sabado);

    // Filtra no array os registros que pertencem exclusivamente a essa semana
    const registrosDaSemana = listaRegistros.filter(registro => {
      return registro.data >= dataInicio && registro.data <= dataFim;
    });

    if (registrosDaSemana.length === 0) {
      alert(`Nenhum registro encontrado para a semana atual (${dataInicio.split('-').reverse().join('/')} até ${dataFim.split('-').reverse().join('/')}).`);
      return;
    }

    executarDownloadCSV(registrosDaSemana, `${prefixoNome}_Semanal_${dataInicio}_a_${dataFim}.csv`);
  };

  // Funções encapsuladas que repassam a lista global de dados para a função de download
  const exportarParaExcel = () => executarDownloadCSV(registros, 'Frequencia_Completa_Consolidada.csv');
  const exportarSemanaAtualExcel = () => executarDownloadSemanalCSV(registros, 'Frequencia_Global');

  // Funções encapsuladas que repassam apenas a lista do professor logado para a função de download
  const exportarMeusParaExcel = () => executarDownloadCSV(meusRegistros, 'Minhas_Chamadas_Completas.csv');
  const exportarMeusSemanaAtualExcel = () => executarDownloadSemanalCSV(meusRegistros, 'Minhas_Chamadas');

  // Baixa o arquivo isolado de apenas 1 aula específica
  const exportarRegistroUnico = (registro) => {
    const dataFormatada = registro.data.split('-').reverse().join('/');
    const turmaLimpa = registro.turma.replace(/\s+/g, '');
    const disciplinaLimpa = (registro.disciplina || 'Geral').replace(/\s+/g, '');
    const dataLimpa = dataFormatada.replace(/\//g, '-');
    const nomeArquivo = `Frequencia_${turmaLimpa}_${disciplinaLimpa}_${dataLimpa}.csv`;
    
    executarDownloadCSV([registro], nomeArquivo);
  };

  // Gera o arquivo focado apenas nos dados cadastrais dos estudantes (não exporta as presenças)
  const exportarAlunosExcel = () => {
    if (alunosFiltradosLista.length === 0) return;
    let csvContent = "Matricula;Nome;Turma;Status do Cadastro\n";
    alunosFiltradosLista.forEach(aluno => {
      const statusStr = aluno.ativo ? "Ativo" : "Inativo";
      csvContent += `"${aluno.matricula || 'N/A'}";"${aluno.nome}";"${aluno.turma}";"${statusStr}"\n`;
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); 
    const link = document.createElement("a"); 
    link.setAttribute("href", url); 
    const nomeArquivo = filtroTurmaAlunos === 'Todas' 
      ? 'Lista_Completa_Alunos_Matriculados.csv' 
      : `Lista_Alunos_${filtroTurmaAlunos.replace(/\s+/g, '_')}.csv`;
    link.setAttribute("download", nomeArquivo); 
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link); 
  };

  // Verifica a senha para destravar a tela administrativa da Coordenação
  const handleDesbloquearDados = async (e) => {
    e.preventDefault(); 
    if (!senhaDigitada.trim()) return;

    setIsVerifyingSenha(true);
    setErroSenha(false);

    try {
      const configRef = collection(db, 'artifacts', appId, 'public', 'data', 'config');
      const configQuery = query(configRef, where('idConfig', '==', 'senha_relatorios'));
      const snapshot = await getDocs(configQuery);
      let senhaOficial = "GALT2026"; 

      if (!snapshot.empty) {
        senhaOficial = snapshot.docs[0].data().senha;
      } else {
        await addDoc(configRef, { idConfig: 'senha_relatorios', senha: 'GALT2026' });
      }

      if (senhaDigitada === senhaOficial) {
        setIsDadosUnlocked(true);
        setErroSenha(false);
        setSenhaDigitada('');
      } else {
        setErroSenha(true);
        setSenhaDigitada('');
      }
    } catch (error) {
      console.error("Erro ao validar senha no banco:", error);
      setErroSenha(true);
    } finally {
      setIsVerifyingSenha(false);
    }
  };

  // ============================================================================
  // PREPARAÇÃO DE VARIÁVEIS PARA RENDERIZAÇÃO NA TELA
  // ============================================================================
  
  // Alunos que serão listados na tabela de preenchimento da chamada
  const alunosExibidos = alunosAtivos.filter(aluno => 
    aluno.turma === turmaSelecionada && 
    aluno.nome.toLowerCase().includes(buscaAlunoLista.toLowerCase())
  );

  // Alunos que serão listados na aba de "Gestão de Alunos"
  const alunosFiltradosLista = (filtroTurmaAlunos === 'Todas' ? alunosAtivos : alunosAtivos.filter(aluno => aluno.turma === filtroTurmaAlunos))
    .filter(aluno => aluno.nome.toLowerCase().includes(buscaAlunoLista.toLowerCase()));

  // Cálculos dinâmicos da caixinha de Resumo da chamada (presenças, faltas, etc.)
  const contagemPresentes = alunosExibidos.filter(a => {
    const s = presencas[a.id]?.status || 'I'; 
    return s === 'I' || s === 'M' || s === 'P'; 
  }).length;
  
  const contagemF = alunosExibidos.filter(a => (presencas[a.id]?.status) === 'F').length;
  const contagemJ = alunosExibidos.filter(a => (presencas[a.id]?.status) === 'J').length;

  // ============================================================================
  // TELA DE LOGIN / RECUPERAÇÃO DE SENHA (ATUALIZADA)
  // ============================================================================
  if (isCheckingAuth) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-teal-500 font-semibold">Carregando Sistema...</div>;

  // Bloco reestruturado para lidar com a alternância entre formulário de Login e Recuperação
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mx-auto mb-6">
              <img src={galtLogo} alt="Galt Logo" className="h-24 w-auto object-contain" />
            </div>
            {/* O Título muda dinamicamente caso o estado showResetPassword seja ativado */}
            <h1 className="text-2xl font-bold text-slate-800">
              {showResetPassword ? 'Recuperar Senha' : 'Bem-vindo ao Sistema de Frequência'}
            </h1>
            <p className="text-slate-500 mt-2 text-sm">
              {showResetPassword 
                ? 'Digite seu e-mail corporativo para receber um link de redefinição.' 
                : 'Faça login com sua conta corporativa.'}
            </p>
          </div>

          {/* Renderização Condicional: Se NÃO estiver na tela de reset, exibe o Login Padrão */}
          {!showResetPassword ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail Corporativo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Mail size={18} /></div>
                  <input type="email" required value={emailLogin} onChange={(e) => setEmailLogin(e.target.value)} className="w-full pl-10 p-3 bg-white border border-slate-200 text-slate-800 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none" placeholder="nome@galt.com" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-700">Senha</label>
                  {/* Botão de "Esqueceu a Senha" inserido acima do input de senha. Ao clicar, inverte o estado showResetPassword para true e limpa possíveis erros da tela de login */}
                  <button type="button" onClick={() => { setShowResetPassword(true); setErroLogin(''); setMensagemRecuperacao(''); }} className="text-xs text-teal-600 hover:text-teal-800 font-bold">
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Key size={18} /></div>
                  <input type="password" required value={senhaLogin} onChange={(e) => setSenhaLogin(e.target.value)} className="w-full pl-10 p-3 bg-white border border-slate-200 text-slate-800 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none" placeholder="••••••••" />
                </div>
              </div>

              {erroLogin && <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-medium">{erroLogin}</div>}

              <button type="submit" disabled={isLoggingIn} className="w-full py-3 px-4 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg transition-colors shadow-md flex justify-center items-center gap-2 disabled:opacity-50 disabled:pointer-events-none">
                {isLoggingIn ? 'Autenticando...' : <><LogIn size={20} /> Entrar no Sistema</>}
              </button>
            </form>
          ) : (
            /* Renderização Condicional: Se ESTIVER na tela de reset (true), exibe este formulário */
            <form onSubmit={handleRecuperarSenha} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail Corporativo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Mail size={18} /></div>
                  {/* Reaproveita o estado emailLogin para facilitar a experiência (o que ele digitou no login não se perde) */}
                  <input type="email" required value={emailLogin} onChange={(e) => setEmailLogin(e.target.value)} className="w-full pl-10 p-3 bg-white border border-slate-200 text-slate-800 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none" placeholder="nome@galt.com" />
                </div>
              </div>

              {/* Caixa de feedback interativa que muda a cor dependendo se a mensagem de resposta contiver um check(✅) ou um xis(❌) */}
              {mensagemRecuperacao && (
                <div className={`p-3 border rounded-lg text-sm font-medium ${mensagemRecuperacao.includes('❌') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-teal-50 text-teal-700 border-teal-100'}`}>
                  {mensagemRecuperacao}
                </div>
              )}

              <div className="flex flex-col gap-3 mt-4">
                <button type="submit" disabled={isSendingReset || !emailLogin} className="w-full py-3 px-4 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg transition-colors shadow-md flex justify-center items-center gap-2 disabled:opacity-50 disabled:pointer-events-none">
                  {isSendingReset ? 'Enviando...' : 'Enviar Link de Recuperação'}
                </button>
                
                {/* Botão secundário para cancelar a ação. Reseta a tela de recuperação e volta a mostrar o formulário de senha do Login normal */}
                <button type="button" onClick={() => { setShowResetPassword(false); setMensagemRecuperacao(''); }} className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-bold rounded-lg transition-colors">
                  Voltar para o Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // TELA PRINCIPAL - DASHBOARD LATERAL E MOBILE
  // ============================================================================
  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden">
      
      {/* MENU LATERAL MOBILE (Sobreposição de tela preta) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div 
            className="fixed inset-0 bg-slate-900/60 transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          
          <aside className="relative w-64 max-w-[80%] bg-[#1E293B] text-white flex flex-col h-full shadow-2xl animate-in slide-in-from-left duration-300">
            <button 
              onClick={() => setIsMobileMenuOpen(false)} 
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
            >
              <X size={24} />
            </button>

            <a 
              href="https://www.galtvestibulares.com.br/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="h-20 flex items-center px-6 border-b border-slate-700/50 hover:bg-slate-800 transition-colors"
            >
              <img src={galtLogo} alt="Galt" className="h-8 w-auto object-contain shrink-0 mr-3" />
              <span className="font-bold text-lg tracking-wide truncate text-white">Galt <span className="font-normal text-teal-400">Vestibulares</span></span>
            </a>
            
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
              <button 
                onClick={() => trocarAba('frequencia')} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
                  ${activeTab === 'frequencia' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <ClipboardList size={20} /> Frequência
              </button>
              
              <button 
                onClick={() => trocarAba('alunos')} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
                  ${activeTab === 'alunos' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <Users size={20} /> Alunos
              </button>

              <button 
                onClick={() => trocarAba('perfil')} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
                  ${activeTab === 'perfil' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <User size={20} /> Meu Perfil
              </button>

              <button 
                onClick={() => trocarAba('relatorios')} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
                  ${activeTab === 'relatorios' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <Unlock size={20} /> Relatórios
              </button>
            </nav>

            <div className="p-4 border-t border-slate-700/50 mt-auto">
              <div 
                onClick={() => trocarAba('perfil')}
                className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-800 cursor-pointer transition-colors"
              >
                {perfilUsuario.foto ? (
                  <img src={perfilUsuario.foto} alt="Perfil" className="w-10 h-10 rounded-full object-cover border border-slate-600 shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-teal-400 border border-slate-600 font-bold shrink-0">
                    {perfilUsuario.nome ? perfilUsuario.nome.charAt(0).toUpperCase() : 'P'}
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-bold truncate text-slate-200">{perfilUsuario.nome || 'Professor'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleLogout(); }} className="text-slate-500 hover:text-[#FB923C] transition-colors shrink-0" title="Sair">
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* BARRA LATERAL (SIDEBAR DESKTOP) */}
      <aside className="w-64 bg-[#1E293B] text-white flex-col shadow-xl z-20 hidden md:flex shrink-0">
        <a 
          href="https://www.galtvestibulares.com.br/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="h-20 flex items-center px-6 border-b border-slate-700/50 hover:bg-slate-800 transition-colors"
          title="Visitar site oficial da Galt"
        >
          <img src={galtLogo} alt="Galt" className="h-8 w-auto object-contain shrink-0 mr-3" />
          <span className="font-bold text-lg tracking-wide truncate text-white">Galt <span className="font-normal text-teal-400">Vestibulares</span></span>
        </a>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <button 
            onClick={() => setActiveTab('frequencia')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
              ${activeTab === 'frequencia' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <ClipboardList size={20} /> Frequência
          </button>
          
          <button 
            onClick={() => setActiveTab('alunos')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
              ${activeTab === 'alunos' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <Users size={20} /> Alunos
          </button>

          <button 
            onClick={() => setActiveTab('perfil')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
              ${activeTab === 'perfil' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <User size={20} /> Meu Perfil
          </button>

          <button 
            onClick={() => setActiveTab('relatorios')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
              ${activeTab === 'relatorios' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <Unlock size={20} /> Relatórios
          </button>
        </nav>

        <div className="p-4 border-t border-slate-700/50 mt-auto">
          <div 
            onClick={() => setActiveTab('perfil')}
            className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-800 cursor-pointer transition-colors"
            title="Acessar meu perfil"
          >
            {perfilUsuario.foto ? (
              <img src={perfilUsuario.foto} alt="Perfil" className="w-10 h-10 rounded-full object-cover border border-slate-600 shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-teal-400 border border-slate-600 font-bold shrink-0">
                {perfilUsuario.nome ? perfilUsuario.nome.charAt(0).toUpperCase() : 'P'}
              </div>
            )}
            
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold truncate text-slate-200">{perfilUsuario.nome || 'Professor'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
            
            <button onClick={(e) => { e.stopPropagation(); handleLogout(); }} className="text-slate-500 hover:text-[#FB923C] transition-colors shrink-0" title="Sair">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL (ÁREA DIREITA) */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        <header className="h-16 sm:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 z-10 shrink-0 gap-4">
          <div className="flex items-center gap-3 w-full max-w-md">
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="md:hidden p-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors shrink-0"
              title="Abrir Menu"
            >
              <Menu size={24} />
            </button>
            
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={18} />
              </div>
              <input 
                type="text" 
                value={buscaAlunoLista}
                onChange={(e) => setBuscaAlunoLista(e.target.value)}
                className="w-full pl-10 p-2 sm:p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm text-slate-800 placeholder-slate-400" 
                placeholder="Buscar aluno por nome..." 
              />
            </div>
          </div>
          <div></div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          
          {/* ================================================================= */}
          {/* ABA 1: FREQUÊNCIA                                                 */}
          {/* ================================================================= */}
          {activeTab === 'frequencia' && (
            <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
              
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end mb-6 sm:mb-8 gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Lista de Frequência</h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">Registre a presença dos alunos da turma selecionada. Lembre de selecionar a sua disciplina.</p>
                </div>
                <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                  <button 
                    onClick={handleCliqueSalvarOuAtualizar} 
                    disabled={isSavingChamada || alunosExibidos.length === 0 || isEditExpired || !turmaSelecionada || !disciplinaSelecionada}
                    className="flex-1 sm:flex-none justify-center px-6 py-2 bg-[#FB923C] hover:bg-[#F6AD55] disabled:opacity-50 disabled:pointer-events-none text-white rounded-lg font-bold transition-colors shadow-md text-sm flex items-center gap-2"
                  >
                    {isSavingChamada ? 'Processando...' : registroAtualId ? <><Edit3 size={16} /> Atualizar</> : <><Save size={16} /> Salvar</>}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Data da Aula</label>
                    <div className="relative">
                      <input type="date" value={dataChamada} onChange={(e) => setDataChamada(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm text-slate-700 bg-slate-50" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Turma</label>
                    <select value={turmaSelecionada} onChange={(e) => setTurmaSelecionada(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm text-slate-700 bg-slate-50">
                      {turmas.length === 0 ? <option value="">Carregando...</option> : null}
                      {turmas.map(turma => (
                        <option key={turma} value={turma}>{turma}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Disciplina</label>
                      <button type="button" onClick={() => setShowModalNovaDisciplina(true)} className="text-[10px] text-teal-600 hover:underline font-bold">+ Nova</button>
                    </div>
                    <select value={disciplinaSelecionada} onChange={(e) => setDisciplinaSelecionada(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm text-slate-700 bg-slate-50">
                      {disciplinas.length === 0 ? <option value="">Carregando...</option> : null}
                      {disciplinas.map(disc => (
                        <option key={disc} value={disc}>{disc}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Resumo</label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-green-50 text-green-700 rounded-lg flex flex-col items-center justify-center py-1 border border-green-100">
                        <span className="text-base sm:text-lg font-bold leading-none">{contagemPresentes}</span>
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase mt-1">Presenças</span>
                      </div>
                      <div className="flex-1 bg-red-50 text-red-700 rounded-lg flex flex-col items-center justify-center py-1 border border-red-100">
                        <span className="text-base sm:text-lg font-bold leading-none">{contagemF}</span>
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase mt-1">Faltas</span>
                      </div>
                      <div className="flex-1 bg-yellow-50 text-yellow-700 rounded-lg flex flex-col items-center justify-center py-1 border border-yellow-100">
                        <span className="text-base sm:text-lg font-bold leading-none">{contagemJ}</span>
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase mt-1">Justificados</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {registroAtualId && !isEditExpired && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 mb-6 rounded-xl flex items-start gap-3">
                  <AlertCircle className="text-yellow-500 mt-0.5 shrink-0" size={20} />
                  <div>
                    <h3 className="text-yellow-800 font-bold text-sm">Modo de Edição Ativo</h3>
                    <p className="text-xs text-yellow-700 mt-1">Esta chamada já foi salva. Você tem 24 horas para corrigir qualquer erro antes que o registro seja bloqueado permanentemente.</p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Marque se o aluno esteve em aula integral, meio período, faltou ou teve alguma justificativa:</span>
                  <button onClick={() => {
                      if(isEditExpired) return;
                      const novaPresenca = {...presencas};
                      alunosExibidos.forEach(a => novaPresenca[a.id] = { status: 'I', observacao: novaPresenca[a.id]?.observacao || ''});
                      setPresencas(novaPresenca);
                  }} className="w-full sm:w-auto px-3 py-2 sm:py-1.5 bg-green-100 hover:bg-green-200 text-green-800 text-xs font-bold rounded-md transition-colors">Marcar Todos Integral</button>
                </div>

                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-white border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="p-4 font-semibold w-1/3 pl-4 sm:pl-8">Aluno</th>
                        <th className="p-4 font-semibold w-1/3">Frequência</th>
                        <th className="p-4 font-semibold pr-4 sm:pr-8">Observações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {alunosExibidos.length === 0 ? (
                        <tr><td colSpan="3" className="p-12 text-center text-slate-500">Nenhum aluno encontrado nesta turma ou busca.</td></tr>
                      ) : (
                        alunosExibidos.map((aluno) => {
                          const dadosAluno = presencas[aluno.id] || { status: 'I', observacao: '' };
                          const s = dadosAluno.status;
                          
                          const btnClass = "px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-semibold transition-all border flex-1 sm:flex-none text-center whitespace-nowrap";
                          
                          return (
                            <tr key={aluno.id} className="hover:bg-slate-50/50 group">
                              <td className="p-4 pl-4 sm:pl-8">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                    {aluno.nome.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-semibold text-slate-800 text-sm truncate">{aluno.nome}</div>
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{aluno.matricula !== 'N/A' ? aluno.matricula : 'Sem Matrícula'}</div>
                                  </div>
                                </div>
                              </td>
                              
                              <td className="p-4">
                                <div className="inline-flex w-full sm:w-auto rounded-lg shadow-sm overflow-hidden border border-slate-200">
                                  <button onClick={() => handleAlterarDadosAluno(aluno.id, 'status', 'I')} disabled={isEditExpired} className={`${btnClass} ${s === 'I' || s === 'P' ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-slate-500 hover:bg-slate-50 border-transparent border-r-slate-200'}`}>Integral</button>
                                  <button onClick={() => handleAlterarDadosAluno(aluno.id, 'status', 'M')} disabled={isEditExpired} className={`${btnClass} ${s === 'M' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-500 hover:bg-slate-50 border-transparent border-r-slate-200'}`}>Meio</button>
                                  <button onClick={() => handleAlterarDadosAluno(aluno.id, 'status', 'F')} disabled={isEditExpired} className={`${btnClass} ${s === 'F' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-slate-500 hover:bg-slate-50 border-transparent border-r-slate-200'}`}>Falta</button>
                                  <button onClick={() => handleAlterarDadosAluno(aluno.id, 'status', 'J')} disabled={isEditExpired} className={`${btnClass} ${s === 'J' ? 'bg-[#FB923C] text-white border-orange-400' : 'bg-white text-slate-500 hover:bg-slate-50 border-transparent'}`}>Justificado</button>
                                </div>
                              </td>

                              <td className="p-4 pr-4 sm:pr-8">
                                <input 
                                  type="text" 
                                  placeholder="Adicionar nota..."
                                  value={dadosAluno.observacao}
                                  onChange={(e) => handleAlterarDadosAluno(aluno.id, 'observacao', e.target.value)}
                                  disabled={isEditExpired}
                                  className="w-full min-w-[150px] p-2 text-xs bg-transparent border-b border-transparent hover:border-slate-200 focus:border-teal-500 focus:bg-white outline-none transition-all text-slate-600 placeholder-slate-400"
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
                  {mensagemFeedback && (
                    <span className="flex items-center text-teal-600 font-bold animate-pulse">
                      <Check size={14} className="mr-1" /> {mensagemFeedback}
                    </span>
                  )}
                  <span className="ml-auto">Mostrando {alunosExibidos.length} aluno(s).</span>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* ABA 2: ALUNOS E TURMAS (GESTÃO)                                   */}
          {/* ================================================================= */}
          {activeTab === 'alunos' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
              
              <div className="flex justify-between items-end mb-4 sm:mb-6">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Gestão de Alunos</h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">Adicione alunos manualmente ou importe uma planilha base.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                
                <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 h-full">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                    <UserPlus size={20} className="text-teal-500" /> Cadastro Manual
                  </h2>
                  
                  <form onSubmit={handleAdicionarAluno} className="flex flex-col gap-4 sm:gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nome Completo</label>
                      <input type="text" required placeholder="Ex: João da Silva" value={novoAlunoNome} onChange={(e) => setNovoAlunoNome(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none uppercase text-sm bg-white text-slate-800" />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Matrícula (Opcional)</label>
                        <input type="text" placeholder="Ex: 2026001" value={novoAlunoMatricula} onChange={(e) => setNovoAlunoMatricula(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm bg-white text-slate-800" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Turma</label>
                          <button type="button" onClick={() => setShowModalNovaTurma(true)} className="text-[10px] text-teal-600 hover:text-teal-800 font-bold hover:underline transition-colors">+ Nova</button>
                        </div>
                        <select value={novoAlunoTurma} onChange={(e) => setNovoAlunoTurma(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm bg-white text-slate-800">
                          {turmas.length === 0 ? <option value="">Carregando...</option> : null}
                          {turmas.map(turma => (
                            <option key={turma} value={turma}>{turma}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <button type="submit" disabled={isAddingAluno || !novoAlunoNome.trim() || !novoAlunoTurma} className="mt-2 w-full flex justify-center items-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 disabled:pointer-events-none text-sm">
                      {isAddingAluno ? 'Adicionando...' : 'Cadastrar Aluno'}
                    </button>
                  </form>
                </div>

                <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                    <UploadCloud size={20} className="text-[#FB923C]" /> Importar Planilha
                  </h2>
                  <p className="text-xs text-slate-500 mb-4 sm:mb-6">Carregue um arquivo (.xlsx/.csv) com as colunas <strong className="text-slate-700">Nome</strong>, <strong className="text-slate-700">Turma</strong> e <strong className="text-slate-700">Matricula</strong>.</p>
                  
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center flex-grow flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors relative cursor-pointer group">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                      <FileSpreadsheet size={24} className="text-[#FB923C]" />
                    </div>
                    <p className="text-sm font-bold text-slate-600">Clique para selecionar o arquivo</p>
                    <input 
                      type="file" 
                      accept=".xlsx, .xls, .csv" 
                      onChange={handleImportarPlanilha} 
                      disabled={isImporting}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                    />
                  </div>
                  
                  {mensagemImportacao && (
                    <div className={`mt-4 text-center text-xs font-bold p-3 rounded-lg ${mensagemImportacao.includes('Erro') ? 'bg-red-50 text-red-600' : 'bg-teal-50 text-teal-700'}`}>
                      {mensagemImportacao}
                    </div>
                  )}
                </div>

              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6 sm:mt-8">
                
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-slate-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full">
                    <h3 className="font-bold text-slate-700">Base de Alunos ({alunosFiltradosLista.length})</h3>
                    
                    <div className="flex gap-2 w-full sm:w-auto">
                      <select 
                        value={filtroTurmaAlunos} 
                        onChange={(e) => setFiltroTurmaAlunos(e.target.value)}
                        className="flex-1 sm:flex-none p-2 text-xs font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-slate-600 bg-white"
                      >
                        <option value="Todas">Todas as Turmas</option>
                        {turmas.map(turma => (
                          <option key={turma} value={turma}>{turma}</option>
                        ))}
                      </select>

                      <button 
                        onClick={exportarAlunosExcel} 
                        disabled={alunosFiltradosLista.length === 0} 
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1E293B] hover:bg-slate-800 text-white rounded-lg font-bold transition-colors shadow-sm disabled:opacity-50 text-xs whitespace-nowrap"
                      >
                        <Download size={14} /> Exportar
                      </button>
                    </div>
                  </div>
                  
                  {alunosAtivos.length === 0 && (
                    <button onClick={popularComDadosDeExemplo} className="text-xs text-[#FB923C] hover:underline font-bold self-start sm:self-auto mt-2 sm:mt-0">Gerar Dados de Teste</button>
                  )}
                </div>
                
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-white border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="p-4 font-semibold w-24 pl-4 sm:pl-6">Matrícula</th>
                        <th className="p-4 font-semibold">Nome</th>
                        <th className="p-4 font-semibold w-32">Turma</th>
                        <th className="p-4 font-semibold w-24 text-center pr-4 sm:pr-6">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {alunosFiltradosLista.length === 0 ? (
                        <tr><td colSpan="4" className="p-12 text-center text-slate-500 text-sm">Nenhum aluno encontrado.</td></tr>
                      ) : (
                        alunosFiltradosLista.map((aluno) => (
                          <tr key={aluno.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 pl-4 sm:pl-6 font-mono text-xs text-slate-400">{aluno.matricula || 'N/A'}</td>
                            <td className="p-4 font-semibold text-slate-700 text-sm whitespace-nowrap truncate max-w-[200px]">{aluno.nome}</td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border ${obterCorDaTurma(aluno.turma)}`}>
                                {aluno.turma}
                              </span>
                            </td>
                            <td className="p-4 pr-4 sm:pr-6 flex items-center justify-center gap-2">
                              <button onClick={() => abrirModalEdicaoAluno(aluno)} className="p-1.5 text-teal-500 hover:bg-teal-50 rounded-md transition-colors"><Pencil size={16} /></button>
                              <button onClick={() => setAlunoParaRemover(aluno)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* ABA 3: MEU PERFIL                                                 */}
          {/* ================================================================= */}
          {activeTab === 'perfil' && (
            <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300">
              
              <div className="mb-4 sm:mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Meu Perfil</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Gerencie suas informações e veja o histórico das chamadas que você realizou.</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 sm:p-10 border-b border-slate-100">
                  <form onSubmit={handleSalvarPerfil} className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start">
                    
                    <div className="flex flex-col items-center gap-3 shrink-0">
                      <div className="relative group cursor-pointer">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-slate-50 bg-slate-100 flex items-center justify-center shadow-md overflow-hidden relative">
                          {perfilUsuario.foto ? (
                            <img src={perfilUsuario.foto} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User size={40} className="text-slate-400" />
                          )}
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera size={24} className="text-white" />
                          </div>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFotoChange} 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                          title="Mudar foto de perfil"
                        />
                      </div>
                      
                      {perfilUsuario.foto && (
                        <button 
                          type="button" 
                          onClick={handleRemoverFoto} 
                          className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-red-50"
                        >
                          <Trash2 size={12} /> Remover foto
                        </button>
                      )}
                    </div>

                    <div className="flex-1 w-full space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nome de Exibição</label>
                        <input 
                          type="text" 
                          required 
                          value={perfilUsuario.nome} 
                          onChange={(e) => setPerfilUsuario(prev => ({ ...prev, nome: e.target.value }))} 
                          className="w-full max-w-md p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-medium text-slate-800 bg-white" 
                          placeholder="Seu nome..." 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">E-mail de Acesso (Login)</label>
                        <p className="text-xs sm:text-sm font-mono text-slate-500 bg-slate-50 px-3 py-2 rounded-lg inline-block border border-slate-100 break-all">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 w-full sm:w-auto mt-4 sm:mt-0 sm:ml-auto">
                      <button type="submit" disabled={isSavingPerfil} className="px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 disabled:pointer-events-none w-full flex justify-center items-center gap-2">
                        {isSavingPerfil ? 'Salvando...' : <><Save size={18} /> Salvar Perfil</>}
                      </button>
                      {mensagemFeedback && (
                        <span className="text-xs font-bold text-teal-600 text-center animate-pulse">{mensagemFeedback}</span>
                      )}
                    </div>
                  </form>
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <ClipboardList size={20} className="text-[#FB923C]" /> Minhas Chamadas
                  </h2>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={exportarMeusSemanaAtualExcel} disabled={meusRegistros.length === 0} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-[#FB923C] hover:bg-[#F6AD55] text-white rounded-lg font-bold transition-colors shadow-sm disabled:opacity-50 text-xs whitespace-nowrap">
                      <Calendar size={14} /> Semana
                    </button>
                    <button onClick={exportarMeusParaExcel} disabled={meusRegistros.length === 0} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-bold transition-colors shadow-sm disabled:opacity-50 text-xs whitespace-nowrap">
                      <Download size={14} /> Completo
                    </button>
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  {isLoadingMeusDados ? (
                    <div className="p-10 text-center text-slate-400">
                      <div className="animate-spin w-8 h-8 border-4 border-[#FB923C] border-t-transparent rounded-full mx-auto mb-4"></div>
                      Buscando suas chamadas...
                    </div>
                  ) : meusRegistros.length === 0 ? (
                    <div className="p-10 text-center text-slate-500 font-medium text-sm">Você ainda não realizou nenhuma chamada.</div>
                  ) : (
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left min-w-[700px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                            <th className="p-4 sm:p-5 font-semibold pl-4 sm:pl-6">Data</th>
                            <th className="p-4 sm:p-5 font-semibold">Turma / Disciplina</th>
                            <th className="p-4 sm:p-5 font-semibold text-center">PRESENÇAS</th>
                            <th className="p-4 sm:p-5 font-semibold text-center text-red-500">Faltas</th>
                            <th className="p-4 sm:p-5 font-semibold text-center text-yellow-600">Justificados</th>
                            <th className="p-4 sm:p-5 font-semibold text-center pr-4 sm:pr-6">Baixar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {meusRegistros.map((registro) => {
                            const integrais = registro.detalhes.filter(a => a.status === 'I').length;
                            const meios = registro.detalhes.filter(a => a.status === 'M').length;
                            const presentesAntigos = registro.detalhes.filter(a => a.status === 'P').length; 
                            const faltas = registro.detalhes.filter(a => a.status === 'F').length;
                            const justificadas = registro.detalhes.filter(a => a.status === 'J').length;
                            
                            const dataFormatada = registro.data.split('-').reverse().join('/');
                            const totaisPositivos = integrais + meios + presentesAntigos;

                            return (
                              <tr key={registro.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 sm:p-5 pl-4 sm:pl-6 font-bold text-slate-700 text-sm whitespace-nowrap">{dataFormatada}</td>
                                <td className="p-4 sm:p-5">
                                  <div className="font-semibold text-slate-800 text-sm whitespace-nowrap">{registro.turma}</div>
                                  <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[150px]">{registro.disciplina || 'Geral'}</div>
                                </td>
                                <td className="p-4 sm:p-5 text-center font-bold text-teal-600 bg-teal-50/30">{totaisPositivos}</td>
                                <td className="p-4 sm:p-5 text-center font-bold text-red-500 bg-red-50/30">{faltas}</td>
                                <td className="p-4 sm:p-5 text-center font-bold text-yellow-600 bg-yellow-50/30">{justificadas}</td>
                                <td className="p-4 sm:p-5 pr-4 sm:pr-6 text-center">
                                  <button onClick={() => exportarRegistroUnico(registro)} className="p-2 text-slate-400 hover:text-[#FB923C] hover:bg-orange-50 rounded-lg transition-all border border-transparent hover:border-orange-200" title="Baixar planilha desta chamada">
                                    <Download size={18} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* ABA 4: RELATÓRIOS DA COORDENAÇÃO (RESTRITO)                       */}
          {/* ================================================================= */}
          {activeTab === 'relatorios' && (
            <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
              
              <div className="mb-6 sm:mb-8">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Relatórios de Coordenação</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Área restrita para exportação da equipe de dados do Galt.</p>
              </div>

              {!isDadosUnlocked ? (
                
                <div className="max-w-md mx-auto mt-10 sm:mt-16 bg-white p-6 sm:p-10 rounded-3xl shadow-xl border border-slate-100 text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#1E293B] text-teal-400 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3 shadow-lg">
                    <Lock size={32} />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">Acesso Protegido</h2>
                  <p className="text-slate-500 text-xs sm:text-sm mb-6 sm:mb-8">Insira a senha para liberar o painel de relatórios de todos os professores.</p>
                  
                  <form onSubmit={handleDesbloquearDados} className="space-y-4">
                    <div>
                      <input 
                        type="password" 
                        placeholder="Senha de Acesso"
                        value={senhaDigitada}
                        onChange={(e) => setSenhaDigitada(e.target.value)}
                        className={`w-full p-3 sm:p-4 border rounded-xl focus:ring-2 focus:outline-none text-center tracking-widest font-mono text-lg bg-white text-slate-800 ${erroSenha ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-teal-500'}`}
                        autoFocus
                        disabled={isVerifyingSenha}
                      />
                      {erroSenha && <p className="text-red-500 text-xs mt-2 font-bold">Senha incorreta. Tente novamente.</p>}
                    </div>
                    <button type="submit" disabled={!senhaDigitada.trim() || isVerifyingSenha} className="w-full py-3 sm:py-4 bg-[#1E293B] hover:bg-slate-800 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none shadow-md text-sm sm:text-base">
                      {isVerifyingSenha ? 'Verificando...' : 'Desbloquear Painel'}
                    </button>
                  </form>
                </div>

              ) : (
                
                <div className="space-y-6">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2 sm:gap-3">
                        <Unlock size={20} className="text-teal-500 sm:w-6 sm:h-6"/> Painel Geral
                      </h2>
                      <p className="text-slate-500 text-xs sm:text-sm mt-2">Visão geral de todos os lançamentos de frequência da instituição.</p>
                    </div>
                    
                    <div className="mt-4 lg:mt-0 flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto">
                      {/* ATUALIZADO: O botão agora chama a função exportarSemanaAtualExcel para baixar o arquivo no computador localmente */}
                      <button onClick={exportarSemanaAtualExcel} disabled={registros.length === 0} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 sm:py-3 bg-[#FB923C] hover:bg-[#F6AD55] text-white rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 text-xs sm:text-sm">
                        <Calendar size={16} /> Baixar Resumo Semanal
                      </button>
                      <button onClick={exportarParaExcel} disabled={registros.length === 0} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 sm:py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 text-xs sm:text-sm">
                        <Download size={16} /> Histórico Completo
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {isLoadingDados ? (
                      <div className="p-10 sm:p-16 text-center text-slate-400">
                        <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        Buscando banco de dados...
                      </div>
                    ) : registros.length === 0 ? (
                      <div className="p-10 sm:p-16 text-center text-slate-500 font-medium text-sm">O banco de dados de chamadas está vazio.</div>
                    ) : (
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left min-w-[700px]">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                              <th className="p-4 sm:p-5 font-semibold pl-4 sm:pl-6">Data</th>
                              <th className="p-4 sm:p-5 font-semibold">Turma / Disciplina</th>
                              <th className="p-4 sm:p-5 font-semibold">Lançado Por</th>
                              <th className="p-4 sm:p-5 font-semibold text-center">PRESENÇAS</th>
                              <th className="p-4 sm:p-5 font-semibold text-center text-red-500">Faltas</th>
                              <th className="p-4 sm:p-5 font-semibold text-center text-yellow-600">Justificados</th>
                              <th className="p-4 sm:p-5 font-semibold text-center pr-4 sm:pr-6">Baixar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {registros.map((registro) => {
                              const integrais = registro.detalhes.filter(a => a.status === 'I').length;
                              const meios = registro.detalhes.filter(a => a.status === 'M').length;
                              const presentesAntigos = registro.detalhes.filter(a => a.status === 'P').length; 
                              const faltas = registro.detalhes.filter(a => a.status === 'F').length;
                              const justificadas = registro.detalhes.filter(a => a.status === 'J').length;
                              
                              const dataFormatada = registro.data.split('-').reverse().join('/');
                              const totaisPositivos = integrais + meios + presentesAntigos;

                              return (
                                <tr key={registro.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="p-4 sm:p-5 pl-4 sm:pl-6 font-bold text-slate-700 text-sm whitespace-nowrap">{dataFormatada}</td>
                                  <td className="p-4 sm:p-5">
                                    <div className="font-semibold text-slate-800 text-sm whitespace-nowrap">{registro.turma}</div>
                                    <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[150px]">{registro.disciplina || 'Geral'}</div>
                                  </td>
                                  <td className="p-4 sm:p-5 text-xs text-slate-500 font-mono truncate max-w-[120px]" title={registro.criadoPor}>{registro.criadoPor?.split('@')[0]}</td>
                                  <td className="p-4 sm:p-5 text-center font-bold text-teal-600 bg-teal-50/30">{totaisPositivos}</td>
                                  <td className="p-4 sm:p-5 text-center font-bold text-red-500 bg-red-50/30">{faltas}</td>
                                  <td className="p-4 sm:p-5 text-center font-bold text-yellow-600 bg-yellow-50/30">{justificadas}</td>
                                  <td className="p-4 sm:p-5 pr-4 sm:pr-6 text-center">
                                    <button onClick={() => exportarRegistroUnico(registro)} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all border border-transparent hover:border-teal-200" title="Baixar planilha desta chamada">
                                      <Download size={18} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ================================================================= */}
      {/* MODAIS (POP-UPS SOBREPOSTOS)                                      */}
      {/* ================================================================= */}

      {showModalNovaTurma && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 sm:p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-teal-500 mb-6">
              <Layers size={24} className="sm:w-7 sm:h-7" />
              <h3 className="text-lg sm:text-xl font-bold text-slate-800">Cadastrar Turma</h3>
            </div>
            
            <form onSubmit={handleCriarNovaTurma} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Letra ou Nome da Turma</label>
                <input 
                  type="text" 
                  autoFocus required 
                  placeholder='Ex: "F" ou "Sala F"' 
                  value={nomeNovaTurma} 
                  onChange={(e) => setNomeNovaTurma(e.target.value)} 
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm bg-white text-slate-800" 
                />
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">Informe o nome da turma com a letra. Ex: "Turma F".</p>
              </div>
              
              <div className="flex justify-end gap-2 sm:gap-3 mt-6 sm:mt-8">
                <button type="button" onClick={() => setShowModalNovaTurma(false)} className="px-4 sm:px-5 py-2 sm:py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors text-xs sm:text-sm" disabled={isSavingTurma}>Cancelar</button>
                <button type="submit" disabled={!nomeNovaTurma.trim() || isSavingTurma} className="px-4 sm:px-5 py-2 sm:py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 disabled:pointer-events-none text-xs sm:text-sm">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModalNovaDisciplina && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 sm:p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-[#FB923C] mb-6">
              <BookOpen size={24} className="sm:w-7 sm:h-7" />
              <h3 className="text-lg sm:text-xl font-bold text-slate-800">Nova Disciplina</h3>
            </div>
            
            <form onSubmit={handleCriarNovaDisciplina} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nome da Disciplina</label>
                <input 
                  type="text" 
                  autoFocus required 
                  placeholder='Ex: Robótica' 
                  value={nomeNovaDisciplina} 
                  onChange={(e) => setNomeNovaDisciplina(e.target.value)} 
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm bg-white text-slate-800" 
                />
              </div>
              
              <div className="flex justify-end gap-2 sm:gap-3 mt-6 sm:mt-8">
                <button type="button" onClick={() => setShowModalNovaDisciplina(false)} className="px-4 sm:px-5 py-2 sm:py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors text-xs sm:text-sm" disabled={isSavingDisciplina}>Cancelar</button>
                <button type="submit" disabled={!nomeNovaDisciplina.trim() || isSavingDisciplina} className="px-4 sm:px-5 py-2 sm:py-2.5 bg-[#FB923C] hover:bg-orange-500 text-white rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 disabled:pointer-events-none text-xs sm:text-sm">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModalErro && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-500 mb-4 sm:mb-6">
              <AlertCircle size={28} className="sm:w-8 sm:h-8" />
              <h3 className="text-xl sm:text-2xl font-bold text-slate-800">Ação Bloqueada</h3>
            </div>
            <p className="text-slate-600 text-xs sm:text-sm mb-4">O sistema impediu o salvamento. A formatação da planilha não está de acordo com o exigido para o carregamento. Detalhe:</p>
            <div className="bg-red-50 p-3 sm:p-4 rounded-xl border border-red-100 text-xs sm:text-sm font-medium text-red-800 mb-6 sm:mb-8 leading-relaxed max-h-40 overflow-y-auto">
              {detalhesErro}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setShowModalErro(false)} className="px-5 sm:px-6 py-2.5 sm:py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-colors text-sm sm:text-base">Entendi</button>
            </div>
          </div>
        </div>
      )}
      
      {alunoParaRemover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-500 mb-4 sm:mb-6">
              <AlertTriangle size={28} className="sm:w-8 sm:h-8" />
              <h3 className="text-xl sm:text-2xl font-bold text-slate-800">Arquivar Aluno?</h3>
            </div>
            <p className="text-slate-600 text-sm mb-6 sm:mb-8">Tem certeza que deseja inativar <strong className="text-slate-900">{alunoParaRemover.nome}</strong> da <strong className="text-slate-900">{alunoParaRemover.turma}</strong>? O aluno passará a não ser mais exibido no histórico de frequências.</p>
            <div className="flex justify-end gap-2 sm:gap-3">
              <button onClick={() => setAlunoParaRemover(null)} className="px-4 sm:px-5 py-2.5 sm:py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors text-sm sm:text-base">Cancelar</button>
              <button onClick={handleConfirmarRemocao} className="px-4 sm:px-5 py-2.5 sm:py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors shadow-sm text-sm sm:text-base">Sim, Arquivar</button>
            </div>
          </div>
        </div>
      )}

      {showModalEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-yellow-500 mb-4 sm:mb-6">
              <AlertTriangle size={28} className="sm:w-8 sm:h-8" />
              <h3 className="text-xl sm:text-2xl font-bold text-slate-800">Atenção!</h3>
            </div>
            <p className="text-slate-600 text-sm mb-6 sm:mb-8 leading-relaxed">
              Você está prestes a <strong>sobrescrever</strong> a chamada do dia <strong className="text-slate-900">{dataChamada.split('-').reverse().join('/')}</strong> da disciplina de <strong className="text-slate-900">{disciplinaSelecionada}</strong> para a <strong className="text-slate-900">{turmaSelecionada}</strong>. Deseja continuar?
            </p>
            <div className="flex justify-end gap-2 sm:gap-3 flex-col sm:flex-row">
              <button onClick={() => setShowModalEdicao(false)} className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors text-sm sm:text-base" disabled={isSavingChamada}>Cancelar</button>
              <button onClick={executarSalvamento} className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold transition-colors shadow-sm flex justify-center items-center gap-2 disabled:opacity-50 disabled:pointer-events-none text-sm sm:text-base">
                {isSavingChamada ? 'Atualizando...' : 'Sim, Substituir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {alunoParaEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-teal-500 mb-6">
              <Pencil size={24} className="sm:w-7 sm:h-7" />
              <h3 className="text-lg sm:text-xl font-bold text-slate-800">Editar Perfil</h3>
            </div>
            
            <form onSubmit={handleSalvarEdicaoAluno} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nome Completo</label>
                <input type="text" required value={editAlunoNome} onChange={(e) => setEditAlunoNome(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none uppercase text-sm bg-white text-slate-800" />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Matrícula</label>
                  <input type="text" value={editAlunoMatricula} onChange={(e) => setEditAlunoMatricula(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm bg-white text-slate-800" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Turma</label>
                  <select value={editAlunoTurma} onChange={(e) => setEditAlunoTurma(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm bg-white text-slate-800">
                    {turmas.map(turma => (
                      <option key={turma} value={turma}>{turma}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 sm:gap-3 mt-6 sm:mt-8">
                <button type="button" onClick={() => setAlunoParaEditar(null)} className="px-4 sm:px-5 py-2 sm:py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors text-xs sm:text-sm" disabled={isSavingEdit}>
                  Cancelar
                </button>
                <button type="submit" disabled={!editAlunoNome.trim() || isSavingEdit} className="px-4 sm:px-5 py-2 sm:py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 disabled:pointer-events-none text-xs sm:text-sm">
                  {isSavingEdit ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}