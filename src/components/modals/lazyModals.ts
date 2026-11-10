import { lazy } from 'react';

// Character & Growth Modals
export const SkillBook = lazy(() => import('../SkillBook'));
export const WeaponMasteryModal = lazy(() => import('../WeaponMasteryModal'));
export const ProfessionMasteryModal = lazy(() => import('../ProfessionMasteryModal').then(m => ({ default: m.ProfessionMasteryModal })));
export const ChefMasteryModal = lazy(() => import('../ChefMasteryModal'));
export const BreederMasteryModal = lazy(() => import('../BreederMasteryModal'));
export const ClassEvolutionModal = lazy(() => import('../ClassEvolutionModal'));
export const CompanionStatusModal = lazy(() => import('../CompanionStatusModal'));
export const CharacterCreationForm = lazy(() => import('../CharacterCreationForm'));
export const DevTools = lazy(() => import('../DevTools'));
export const DevPasswordModal = lazy(() => import('../DevPasswordModal'));

// City & Base Modals
export const BaseModal = lazy(() => import('../BaseModal'));
export const CityInterface = lazy(() => import('../CityInterface'));
export const CityMapBoard = lazy(() => import('../CityMapBoard'));
export const MapModal = lazy(() => import('../MapModal'));
export const BlacksmithModal = lazy(() => import('../BlacksmithModal'));
export const AlchemyModal = lazy(() => import('../AlchemyModal'));
export const ElfCityModal = lazy(() => import('../ElfCityModal'));
export const BeastCityModal = lazy(() => import('../BeastCityModal'));
export const DemonCityModal = lazy(() => import('../DemonCityModal'));
export const TempleManagementModal = lazy(() => import('../TempleManagementModal'));
export const TempleDefenseEventModal = lazy(() => import('../TempleDefenseEventModal'));
export const TempleConquestResultModal = lazy(() => import('../TempleConquestResultModal'));
export const BaseAttackModal = lazy(() => import('../BaseAttackModal').then(m => ({ default: m.BaseAttackModal })));
export const BaseDamageReportModal = lazy(() => import('../BaseDamageReportModal').then(m => ({ default: m.BaseDamageReportModal })));
export const GodAppearanceManager = lazy(() => import('../GodAppearanceManager'));

// Combat & Adventure Modals
export const CombatInterface = lazy(() => import('../CombatInterface'));
export const IsolatedCombatContainer = lazy(() => import('../combat/IsolatedCombatContainer'));
export const DungeonModal = lazy(() => import('../DungeonModal'));
export const CombatResultModal = lazy(() => import('../CombatResultModal').then(m => ({ default: m.CombatResultModal })));
export const SuddenEventModal = lazy(() => import('../SuddenEventModal').then(m => ({ default: m.SuddenEventModal })));
export const TacticsModal = lazy(() => import('../TacticsModal'));
export const TrainingStyleModal = lazy(() => import('../TrainingStyleModal'));
export const TrainingModal = lazy(() => import('../TrainingModal'));
export const TrainingReportModal = lazy(() => import('../TrainingReportModal').then(m => ({ default: m.TrainingReportModal })));
export const TacticalTrainingModal = lazy(() => import('../TacticalTrainingModal').then(m => ({ default: m.TacticalTrainingModal })));
export const TournamentPostMatchModal = lazy(() => import('../TournamentPostMatchModal'));
export const BestiaryModal = lazy(() => import('../BestiaryModal'));
export const MonsterSkillBook = lazy(() => import('../MonsterSkillBook'));

// Social & Relations Modals
export const SocialNetworkModal = lazy(() => import('../SocialNetworkModal'));
export const AppointmentListModal = lazy(() => import('../AppointmentListModal').then(m => ({ default: m.AppointmentListModal })));
export const CriminalResolutionModal = lazy(() => import('../CriminalResolutionModal'));
export const RelationResolutionModal = lazy(() => import('../RelationResolutionModal'));
export const CommunicationModal = lazy(() => import('../CommunicationModal'));
export const CommunicationBattleModal = lazy(() => import('../CommunicationBattleModal'));
export const CommunicationSummonModal = lazy(() => import('../CommunicationSummonModal'));
export const CommunicationItemModal = lazy(() => import('../CommunicationItemModal'));
export const ConfessionModal = lazy(() => import('../ConfessionModal').then(m => ({ default: m.ConfessionModal })));
export const FamilyChroniclesModal = lazy(() => import('../FamilyChroniclesModal'));
export const SuccessionModal = lazy(() => import('../SuccessionModal'));
export const CondolenceModal = lazy(() => import('../CondolenceModal'));
export const EternalRivalModal = lazy(() => import('../EternalRivalModal'));

// War & Magye Modals
export const MagyeRevoltModal = lazy(() => import('../MagyeRevoltModal'));
export const MagyeDivineWarModal = lazy(() => import('../MagyeDivineWarModal'));
export const MagyeHeavenWarModal = lazy(() => import('../MagyeHeavenWarModal'));
export const WarInvasionModal = lazy(() => import('../WarInvasionModal').then(m => ({ default: m.WarInvasionModal })));

// System & Utility Modals
export const SaveLoadModal = lazy(() => import('../SaveLoadModal'));
export const ActionResultModal = lazy(() => import('../ActionResultModal'));
export const QuantityModal = lazy(() => import('../QuantityModal'));
export const QuestLogModal = lazy(() => import('../QuestLogModal'));
export const ReactionBoardModal = lazy(() => import('../ReactionBoardModal'));
export const DailySummaryPopup = lazy(() => import('../DailySummaryPopup').then(m => ({ default: m.DailySummaryPopup })));
export const WorldNewsModal = lazy(() => import('../WorldNewsModal').then(m => ({ default: m.WorldNewsModal })));
export const TutorialGuideModal = lazy(() => import('../TutorialGuideModal'));
export const ExitGameModal = lazy(() => import('../ExitGameModal'));
export const RestModal = lazy(() => import('../RestModal'));
export const GameSettingsModal = lazy(() => import('../GameSettingsModal').then(m => ({ default: m.GameSettingsModal })));
export const ChoiceEventModal = lazy(() => import('../ChoiceEventModal'));
export const AuthModal = lazy(() => import('../AuthModal'));
export const MailboxModal = lazy(() => import('../MailboxModal'));
export const DashboardModal = lazy(() => import('../DashboardModal'));
